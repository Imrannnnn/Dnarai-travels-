import express from 'express';
import { Blog } from '../models/Blog.js';

const router = express.Router();

router.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Sitemap: https://dnaraitravels.com/sitemap.xml
`);
});

router.get('/sitemap.xml', async (req, res) => {
  try {
    const blogs = await Blog.find({}, 'slug updatedAt').lean();
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://dnaraitravels.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://dnaraitravels.com/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://dnaraitravels.com/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://dnaraitravels.com/time-converter</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;

    blogs.forEach(blog => {
      const lastMod = blog.updatedAt ? new Date(blog.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      xml += `  <url>
    <loc>https://dnaraitravels.com/blog/${blog.slug}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>\n`;
    });

    xml += `</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error('Sitemap generation error:', err);
    res.status(500).send('Error generating sitemap');
  }
});

router.get('/', (req, res) => {
  res.type('text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>D.Narai Travels | Affordable Travel Packages in Nigeria</title>
  <meta name="description" content="D.Narai Travels is a Nigerian travel agency offering standard flight bookings, and tour packages. Contact us today.">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta property="og:title" content="D.Narai Travels | Affordable Travel Packages in Nigeria" />
  <meta property="og:description" content="D.Narai Travels is a Nigerian travel agency offering standard flight bookings, and tour packages. Contact us today." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://dnaraitravels.com/" />
  <meta property="og:image" content="https://dnaraitravels.com/D-NARAI_Logo%2001.svg" />
  <link rel="canonical" href="https://dnaraitravels.com/" />
  <style>
    body {
      font-family: 'Inter', sans-serif;
      line-height: 1.6;
      color: #0f172a;
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 1rem;
      margin-bottom: 2rem;
    }
    nav a {
      margin-left: 1rem;
      text-decoration: none;
      color: #0f172a;
      font-weight: 600;
    }
    h1 {
      font-size: 2.5rem;
      color: #1e3a8a;
      margin-bottom: 1rem;
    }
    h2 {
      font-size: 2rem;
      color: #1e293b;
      margin-top: 2rem;
      margin-bottom: 1rem;
    }
    h3 {
      font-size: 1.5rem;
      color: #334155;
      margin-top: 1.5rem;
      margin-bottom: 0.5rem;
    }
    .cta-button {
      display: inline-block;
      background-color: #0284c7;
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-weight: bold;
      margin-top: 1rem;
    }
    .services {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-top: 1.5rem;
    }
    .service-card {
      background: white;
      padding: 1.5rem;
      border-radius: 0.75rem;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }
    footer {
      margin-top: 4rem;
      border-top: 1px solid #e2e8f0;
      padding-top: 2rem;
      text-align: center;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div style="font-weight: 800; font-size: 1.5rem; color: #1e3a8a;">D.narai Travels</div>
      <nav>
        <a href="/">Home</a>
        <a href="/about">About Us</a>
        <a href="/blog">Blog</a>
        <a href="/time-converter">Time Zones</a>
      </nav>
    </header>
    <main>
      <h1>Affordable Travel Packages in Nigeria & Flight Bookings | D.Narai Travels</h1>
      <p>D.narai Travels is a leading Nigerian travel agency dedicated to bridging all air travel gaps. We offer premium travel management, standard flight bookings, and customized tour packages tailored to your needs.</p>
      
      <a href="/login" class="cta-button">Book Your Flights Now</a>

      <section>
        <h2>Premium Travel Packages & Services in Nigeria</h2>
        <p>Explore the best tour packages, cheap flights, and hotel bookings with D.narai Travels. Our services are client-centric and engineered for trust and speed.</p>
        
        <div class="services">
          <div class="service-card">
            <h3>International & Domestic Flights</h3>
            <p>We provide standard and flexible flight bookings for both domestic flights within Nigeria and international flights worldwide.</p>
          </div>
          <div class="service-card">
            <h3>Customized Tour Packages</h3>
            <p>Experience standard, worry-free holidays with our cheap travel packages and curated vacation tours.</p>
          </div>
          <div class="service-card">
            <h3>Premium Hotel Bookings</h3>
            <p>We partner with top-rated hotels globally and in Nigeria to ensure comfortable stays during your journey.</p>
          </div>
        </div>
      </section>

      <section>
        <h2>Why Choose D.Narai Travels?</h2>
        <ul>
          <li><strong>Zero-Latency Sync:</strong> Real-time carrier data synchronization.</li>
          <li><strong>Client-Centric:</strong> Tailored services to meet customer needs.</li>
          <li><strong>Excellence:</strong> We set the pace that others follow.</li>
        </ul>
      </section>
    </main>
    <footer>
      <p>&copy; 2026 D.narai Travels. All rights reserved. Contact: +234 913 131 5886</p>
    </footer>
  </div>
  <!-- Your React app loads and takes over below -->
  <div id="root"></div>
  <script src="/static/js/main.js"></script>
</body>
</html>`);
});

router.get('/about', (req, res) => {
  res.type('text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>About Us | D.Narai Travels Nigeria</title>
  <meta name="description" content="Learn about D.Narai Travels, a trusted Nigerian travel agency based in Abuja offering flights, tours, and hotel bookings.">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta property="og:title" content="About Us | D.Narai Travels Nigeria" />
  <meta property="og:description" content="Learn about D.Narai Travels, a trusted Nigerian travel agency." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://dnaraitravels.com/about" />
  <link rel="canonical" href="https://dnaraitravels.com/about" />
  <style>
    body {
      font-family: 'Inter', sans-serif;
      line-height: 1.6;
      color: #0f172a;
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 1rem;
      margin-bottom: 2rem;
    }
    nav a {
      margin-left: 1rem;
      text-decoration: none;
      color: #0f172a;
      font-weight: 600;
    }
    h1 {
      font-size: 2.5rem;
      color: #1e3a8a;
      margin-bottom: 1rem;
    }
    h2 {
      font-size: 2rem;
      color: #1e293b;
      margin-top: 2rem;
      margin-bottom: 1rem;
    }
    p {
      color: #334155;
      font-size: 1.1rem;
    }
    footer {
      margin-top: 4rem;
      border-top: 1px solid #e2e8f0;
      padding-top: 2rem;
      text-align: center;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div style="font-weight: 800; font-size: 1.5rem; color: #1e3a8a;">D.narai Travels</div>
      <nav>
        <a href="/">Home</a>
        <a href="/about">About Us</a>
        <a href="/blog">Blog</a>
        <a href="/time-converter">Time Zones</a>
      </nav>
    </header>
    <main>
      <h1>About D.Narai Travels | Travel Packages & Flights in Nigeria</h1>
      <p>D.narai Travels is a premier travel agency in Nigeria for flight bookings, hotels, and custom travel packages. We are dedicated to making air travel seamless for individuals, families, and corporate clients across Nigeria and beyond.</p>
      
      <h2>Our Mandate for Travel Packages in Nigeria</h2>
      <p>To provide an uncompromising layer of intelligence and support between the discerning traveler and the global aviation network, ensuring affordable travel packages in Nigeria.</p>

      <h2>Our Capabilities in Flight Bookings & Hotel Reservations</h2>
      <p>We deploy advanced tracking algorithms and secure data vaults to ensure your flights and hotels are managed with precision and maximum safety.</p>

      <h2>Our Promise to Every Traveler</h2>
      <p>We remain vigilant until you have safely arrived. Excellence is not a goal; it is our baseline for every journey.</p>
    </main>
    <footer>
      <p>&copy; 2026 D.narai Travels. All rights reserved. Contact: +234 913 131 5886</p>
    </footer>
  </div>
  <!-- Your React app loads and takes over below -->
  <div id="root"></div>
  <script src="/static/js/main.js"></script>
</body>
</html>`);
});

router.get('/blog', async (req, res) => {
  try {
    const blogs = await Blog.find({}, 'title slug content createdAt').sort({ createdAt: -1 }).lean();
    
    let blogListHtml = '';
    blogs.forEach(blog => {
      const excerpt = blog.content.substring(0, 150) + (blog.content.length > 150 ? '...' : '');
      blogListHtml += `
      <article style="background: white; padding: 1.5rem; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); margin-bottom: 1.5rem;">
        <h2><a href="/blog/${blog.slug}" style="color: #0284c7; text-decoration: none;">${blog.title}</a></h2>
        <p style="color: #64748b; font-size: 0.85rem;">Published on ${new Date(blog.createdAt).toLocaleDateString()}</p>
        <p>${excerpt}</p>
        <a href="/blog/${blog.slug}" style="color: #1e3a8a; font-weight: bold; text-decoration: none;">Read More &rarr;</a>
      </article>`;
    });

    res.type('text/html');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Travel Insights & Nigeria Flight Updates | D.Narai Travels</title>
  <meta name="description" content="Stay updated with the latest travel insights, tour guide tips, cheap flight deals, and hotel packages in Nigeria from D.Narai Travels.">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta property="og:title" content="Travel Insights & Nigeria Flight Updates | D.Narai Travels" />
  <meta property="og:description" content="Stay updated with the latest travel insights, tour guide tips, cheap flight deals, and hotel packages in Nigeria from D.Narai Travels." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://dnaraitravels.com/blog" />
  <meta property="og:image" content="https://dnaraitravels.com/D-NARAI_Logo%2001.svg" />
  <link rel="canonical" href="https://dnaraitravels.com/blog" />
  <style>
    body {
      font-family: 'Inter', sans-serif;
      line-height: 1.6;
      color: #0f172a;
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 1rem;
      margin-bottom: 2rem;
    }
    nav a {
      margin-left: 1rem;
      text-decoration: none;
      color: #0f172a;
      font-weight: 600;
    }
    h1 {
      font-size: 2.5rem;
      color: #1e3a8a;
      margin-bottom: 2rem;
    }
    footer {
      margin-top: 4rem;
      border-top: 1px solid #e2e8f0;
      padding-top: 2rem;
      text-align: center;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div style="font-weight: 800; font-size: 1.5rem; color: #1e3a8a;">D.narai Travels</div>
      <nav>
        <a href="/">Home</a>
        <a href="/about">About Us</a>
        <a href="/blog">Blog</a>
        <a href="/time-converter">Time Zones</a>
      </nav>
    </header>
    <main>
      <h1>Travel Packages & Flight Insights | D.Narai Travels Blog</h1>
      <p style="margin-bottom: 2rem; font-size: 1.1rem; color: #334155;">Expert perspectives, destination guides, and the latest updates from the heart of D.narai Travels.</p>
      
      <div class="blog-list">
        ${blogListHtml || '<p>No travel updates available at the moment. Please check back later.</p>'}
      </div>
    </main>
    <footer>
      <p>&copy; 2026 D.narai Travels. All rights reserved. Contact: +234 913 131 5886</p>
    </footer>
  </div>
  <!-- Your React app loads and takes over below -->
  <div id="root"></div>
  <script src="/static/js/main.js"></script>
</body>
</html>`);
  } catch (err) {
    console.error('Blog listing SSR error:', err);
    res.status(500).send('Error generating blog page');
  }
});

router.get('/time-converter', (req, res) => {
  res.type('text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Global Flight Time Zone Converter | D.Narai Travels</title>
  <meta name="description" content="Convert travel time zones instantly to stay on schedule for your international flights and hotel bookings. Engineered by D.Narai Travels.">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta property="og:title" content="Global Flight Time Zone Converter | D.Narai Travels" />
  <meta property="og:description" content="Convert travel time zones instantly to stay on schedule for your international flights and hotel bookings." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://dnaraitravels.com/time-converter" />
  <meta property="og:image" content="https://dnaraitravels.com/D-NARAI_Logo%2001.svg" />
  <link rel="canonical" href="https://dnaraitravels.com/time-converter" />
  <style>
    body {
      font-family: 'Inter', sans-serif;
      line-height: 1.6;
      color: #0f172a;
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 1rem;
      margin-bottom: 2rem;
    }
    nav a {
      margin-left: 1rem;
      text-decoration: none;
      color: #0f172a;
      font-weight: 600;
    }
    h1 {
      font-size: 2.5rem;
      color: #1e3a8a;
      margin-bottom: 1rem;
    }
    footer {
      margin-top: 4rem;
      border-top: 1px solid #e2e8f0;
      padding-top: 2rem;
      text-align: center;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div style="font-weight: 800; font-size: 1.5rem; color: #1e3a8a;">D.narai Travels</div>
      <nav>
        <a href="/">Home</a>
        <a href="/about">About Us</a>
        <a href="/blog">Blog</a>
        <a href="/time-converter">Time Zones</a>
      </nav>
    </header>
    <main>
      <h1>Global Flight Time Zone Converter | D.Narai Travels</h1>
      <p>Synchronize your world. Seamlessly track travel time zones with D.narai Travels. Avoid flight delays and missed meetings by using our real-time conversion tool.</p>
      
      <h2>Flight Time Zone Features</h2>
      <ul>
        <li><strong>Precise Conversion:</strong> Coordinates calculations for airport time zones.</li>
        <li><strong>DST Synchronization:</strong> Day-light savings times are handled automatically.</li>
        <li><strong>Global Coverage:</strong> Major aviation hubs from Lagos to London and New York.</li>
      </ul>
    </main>
    <footer>
      <p>&copy; 2026 D.narai Travels. All rights reserved. Contact: +234 913 131 5886</p>
    </footer>
  </div>
  <!-- Your React app loads and takes over below -->
  <div id="root"></div>
  <script src="/static/js/main.js"></script>
</body>
</html>`);
});

export default router;
