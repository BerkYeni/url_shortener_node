const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const shortid = require("shortid");
const bodyParser = require("body-parser");

const app = express();
const port = 3000;

// Database setup
const db = new sqlite3.Database("url_shortener.db", (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log("Connected to the url_shortener database.");
});

db.run(`CREATE TABLE IF NOT EXISTS urls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  long_url TEXT NOT NULL,
  short_url TEXT NOT NULL UNIQUE
)`);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Function to shorten URL
function shortenUrl(longUrl) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT short_url FROM urls WHERE long_url = ?",
      [longUrl],
      (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve(row.short_url);
        } else {
          const shortUrl = shortid.generate();
          db.run(
            "INSERT INTO urls (long_url, short_url) VALUES (?, ?)",
            [longUrl, shortUrl],
            (err) => {
              if (err) {
                reject(err);
              } else {
                resolve(shortUrl);
              }
            }
          );
        }
      }
    );
  });
}

// Home route
app.get("/", (req, res) => {
  res.send(`
    <h1>URL Shortener</h1>
    <form action="/shorten" method="post">
      <input type="url" name="url" placeholder="Enter URL to shorten" required>
      <input type="submit" value="Shorten">
    </form>
  `);
});

// Shorten URL route
app.post("/shorten", async (req, res) => {
  const longUrl = req.body.url;
  try {
    const shortUrl = await shortenUrl(longUrl);
    res.send(`
      <h1>URL Shortener</h1>
      <p>Shortened URL: <a href="/${shortUrl}">${req.get(
      "host"
    )}/${shortUrl}</a></p>
      <a href="/">Shorten another URL</a>
    `);
  } catch (error) {
    res.status(500).send("Error shortening URL");
  }
});

// Redirect route
app.get("/:shortUrl", (req, res) => {
  const shortUrl = req.params.shortUrl;
  db.get(
    "SELECT long_url FROM urls WHERE short_url = ?",
    [shortUrl],
    (err, row) => {
      if (err) {
        res.status(500).send("Database error");
      } else if (row) {
        res.redirect(row.long_url);
      } else {
        res.status(404).send("URL not found");
      }
    }
  );
});

app.listen(port, () => {
  console.log(`URL shortener app listening at http://localhost:${port}`);
});
