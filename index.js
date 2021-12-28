const express = require('express');

const peru = require("./modules/peru.js");
const mexico = require("./modules/mexico.js"); 
const espana = require("./modules/espana.js"); 
const colombia = require("./modules/colombia.js");
const chile = require("./modules/chile.js");
const ecuador = require("./modules/ecuador.js");

const app = express();

app.get("/", function(req, res) {
    res.send("Bienvenido a la api de crawlers");
});

// Perú
app.get("/api/v1/peru/cineplanet/:crawler", async function(req, res) {
    const crawler = req.params.crawler;
    let data = await peru.getFunctionsCineplanet(crawler);
    res.send(data);
});

app.get("/api/v1/peru/cinemark/:crawler", async function(req, res) {
    const crawler = req.params.crawler;
    let data = await peru.getFunctionsCinemark(crawler);
    res.send(data);
});

app.get("/api/v1/peru/cinepolis/:crawlerdist/:crawler", async function(req, res) {
    const crawlerDist = req.params.crawlerdist
    const crawler = req.params.crawler;
    let data = await peru.getFunctionsCinepolis(crawlerDist, crawler);
    res.send(data);
});

app.get("/api/v1/peru/cine-star/:crawler", async function(req, res) {
    const crawler = req.params.crawler
    let data = await peru.getFunctionsCineStar(crawler);
    res.send(data);
});

app.get("/api/v1/peru/movie-time/:crawler", async function(req, res) {
    const crawler = req.params.crawler
    let data = await peru.getFunctionsMovieTime(crawler);
    res.send(data);
});

app.get("/api/v1/peru/cinerama/:crawler", async function(req, res) {
    const crawler = req.params.crawler
    let data = await peru.getFunctionsCinerama(crawler);
    res.send(data);
});


// Mexico
app.get("/api/v1/mexico/distritos", async function(req, res) {
    let data = await mexico.getDistritos();
    res.send(data);
});

app.get("/api/v1/mexico/cines-cadenas", async function(req, res) {
    let data = await mexico.getCinesCadenas();
    res.send(data);
});

app.get("/api/v1/mexico/cines/:crawler", async function(req, res) {
    const crawler = req.params.crawler
    let data = await mexico.getCines(crawler)
    res.send(data)
});

// X0932
app.get("/api/v1/mexico/:crawler", async function(req, res) {
    const crawler = req.params.crawler
    let data = await mexico.getFunctionsForCine(crawler)
    res.send(data)
});


// España
app.get("/api/v1/espana/distritos", async function(req, res) {
    let data = await espana.getDistritos()
    res.send(data)
});
app.get("/api/v1/espana/cines-cadenas", async function(req, res) {
    let data = await espana.getCinesCadenas();
    res.send(data);
});
app.get("/api/v1/espana/cines/:crawler", async function(req, res) {
    const crawler = req.params.crawler
    let data = await espana.getCines(crawler)
    res.send(data);
});
app.get("/api/v1/espana/:crawler", async function(req, res) {
    const crawler = req.params.crawler;
    let data = await espana.getFunctionsForCine(crawler);
    res.send(data);
});


// Colombia
app.get("/api/v1/colombia/cine-colombia/:crawlerDist/:multi/:crawler", async function(req, res) {
    const crawlerDist = req.params.crawlerDist
    const multiplex = req.params.multi
    const crawler = req.params.crawler
    let data = await colombia.getFunctionsCineColombia(crawlerDist, multiplex, crawler);
    res.send(data);
});

app.get("/api/v1/colombia/cinemark/:crawlerDist/:crawler", async function(req, res) {
    const crawlerDist = req.params.crawlerDist
    const crawler = req.params.crawler
    let data = await colombia.getFunctionsCinemark(crawlerDist, crawler);
    res.send(data);
});

app.get("/api/v1/colombia/procinal/:crawlerDist/:teatro/:crawler", async function(req, res) {
    const crawlerDist = req.params.crawlerDist
    const teatro = req.params.teatro
    const crawler = req.params.crawler
    let data = await colombia.getFunctionsProcinal(crawlerDist, teatro, crawler);
    res.send(data);
});

app.get("/api/v1/colombia/cinepolis/:crawlerDist/:crawler", async function(req, res) {
    const crawlerDist = req.params.crawlerDist
    const crawler = req.params.crawler
    let data = await colombia.getFunctionsCinepolis(crawlerDist, crawler);
    res.send(data);
});


// chile
app.get("/api/v1/chile/cine-hoyts/:crawlerDis/:crawler", async function(req, res) {
    let crawlerDis = req.params.crawlerDis
    let crawler = req.params.crawler
    let data = await chile.getFunctionsCineHoys(crawlerDis, crawler);
    res.send(data);
});

app.get("/api/v1/chile/cinemark/:crawler", async function(req, res) {
    const crawler = req.params.crawler;
    let data = await chile.getFunctionsCinemark(crawler);
    res.send(data);
});

app.get("/api/v1/chile/cineplanet/:crawler", async function(req, res) {
    const crawler = req.params.crawler;
    let data = await chile.getFunctionsCineplanet(crawler);
    res.send(data);
});

app.get("/api/v1/chile/cine-star", async function(req, res) {
    let data = await chile.getFunctionsCineStar();
    res.send(data);
});

// ecuador
app.get("/api/v1/ecuador/cinemark/:district/:cine", async function(req, res) {
    const district = req.params.district;
    const cine = req.params.cine;
    let data = await ecuador.getFunctionsCinemark(district, cine);
    res.send(data);
});

app.get("/api/v1/ecuador/supercines", async function(req, res) {
    let data = await ecuador.getFunctionsSuperCines();
    res.send(data);
});

app.get("/api/v1/ecuador/multicines", async function(req, res) {
    let data = await ecuador.getFunctionsMulticines();
    res.send(data);
});

const PORT = 3000

app.listen(PORT, () => {
    console.log('listening on port ' + PORT)
});