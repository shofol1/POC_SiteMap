const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const { SitemapStream, streamToPromise } = require("sitemap");
const { createReadStream } = require("fs");
const { pipeline } = require("stream");
const app = express();

// Middleware
app.use(bodyParser.json());

// Connect to MongoDB
mongoose
  .connect("mongodb://localhost:27017/sitemap", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

// Define the page schema
const pageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    unique: true,
  },
});

// Create the Page model
const Page = mongoose.model("Page", pageSchema);

// API route for adding a new page
app.post("/api/pages", async (req, res) => {
  try {
    const { routeName } = req.body;

    console.log("🚀 ~ file: server.js:40 ~ app.post ~ routeName:", routeName);
    // const oldRoute = await Page.find({ url: routeName });
    // if (oldRoute) {
    //   res.json({ message: "Route already exits" });
    //   return true;
    // }
    // Create a new page
    const page = new Page({ url: routeName });
    await page.save();

    res.status(201).json({ message: "Page added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Function to generate the sitemap XML
const generateSitemapXML = async (steam) => {
  try {
    // Fetch all pages from the database
    const pages = await Page.find();

    let sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    sitemapXML += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    pages.forEach((page) => {
      sitemapXML += `<url>\n`;
      sitemapXML += `<loc>${steam.hostname + page.url}</loc>\n`;
      sitemapXML += `<changefreq>weekly</changefreq>\n`;
      sitemapXML += `<priority>0.9</priority>\n`;
      sitemapXML += `</url>\n`;
    });

    sitemapXML += `</urlset>`;
    return sitemapXML;
  } catch (error) {
    console.error(error);
    throw new Error("Error generating sitemap XML");
  }
};

// API route for generating the sitemap
app.get("/api/generate-sitemap", async (req, res) => {
  try {
    // Fetch all pages from the database
    const pages = await Page.find();

    // Create a sitemap stream
    const stream = new SitemapStream({ hostname: "https://implevista.com" });

    // Add each page URL to the sitemap
    pages.forEach((page) => {
      stream.write({ url: page.url, changefreq: "daily", priority: 0.7 });
    });

    stream.end();

    // Generate the sitemap XML
    const sitemapXML = await generateSitemapXML(stream);

    // Set the response headers
    res.header("Content-Type", "application/xml");
    res.header("Content-Length", sitemapXML.length.toString());

    res.status(200).send(sitemapXML);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start the server
const port = 3001;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
