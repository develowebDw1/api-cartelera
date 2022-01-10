const puppeteer = require('puppeteer');
const moment = require('moment')

const getFunctionsForCine = async (crawler) => {
    const meses = { '01': "ENERO", '02': "FEBRERO", '03': "MARZO", '04': "ABRIL", '05': "MAYO", '06': "JUNIO", '07': "JULIO", '08': "AGOSTO", '09': "SEPTIEMBRE", '10': "OCTUBRE", '11': "NOVIEMBRE", '12': "DICIEMBRE" }
    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ["--no-sandbox", "--disabled-setupid-sandbox"], 
    });
    const page = await browser.newPage();
    await page.goto(`https://www.sensacine.com.mx/cines/cine/${crawler}/`, {
        waitUntil: ['domcontentloaded']
    });

    const data = [];
    let f = 0
    try {
        // await page.waitForSelector('#calendar-date-roller .calendar-date-link.roller-item:not(.disabled)')
        await page.waitForSelector('#theaterpage-showtimes-index-ui:not(.loading)', { timeout: 0 })
    } catch (e) {
        return data
    }
    const filters = await page.$$('#calendar-date-roller .calendar-date-link.roller-item:not(.disabled)')
    for (const filter of filters) {
        const date = await page.evaluate( filter => {
            filter.click()
            return { day: filter.querySelector("div.num").innerText, month: filter.querySelector("div.month").innerText }
        }, filter)

        await page.waitForSelector('#theaterpage-showtimes-index-ui:not(.loading)', { timeout: 0 })

        const dis = await page.$('.card.movie-card-theater')
        if (!dis) {
            continue;
        }
        const result = await page.evaluate(() => {
            let teatrosObj = [];
            document.querySelectorAll('.card.movie-card-theater').forEach(pelicula => {
                let horariosObj = [];
                pelicula.querySelectorAll("div.showtimes-version").forEach(funcion => {
                    let timesObj = [];
                    funcion.querySelectorAll(".showtimes-hour-item").forEach(horario => {
                        let hour = horario.innerText.split("\n")
                        timesObj.push(hour[0]);
                    });
                    horariosObj.push({
                        'formato': "-",
                        'times': timesObj
                    });
                })
                teatrosObj.push({
                    'pelicula': pelicula.querySelector('a.meta-title-link').innerText,
                    'horarios': horariosObj
                });
            });
            return teatrosObj;
        });
        let fechaMoment = moment().add(f, 'days')
        
        let fechaDay = date.day > 9 ? date.day : '0' + date.day 
        let fechaMes = Object.keys(meses).find(key => meses[key] === date.month)
        let fechaAnio = fechaMoment.format("YYYY")
        let fecha = fechaAnio + "-" + fechaMes + "-" + fechaDay
        
        data.push({ fecha: fecha, teatros: result})
        f++
    }
    await browser.close()
    return data;
}

const getCinesCadenas = async () => {
    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ["--no-sandbox", "--disabled-setupid-sandbox"], 
    });
    const page = await browser.newPage();

    await page.goto(`https://www.sensacine.com.mx/cines/`);
    await page.waitForSelector('.theater-network-link');
    const result = await page.evaluate(() => {
        let data = [];
        document.querySelectorAll('a.theater-network-link').forEach(cadena => {
            data.push({
                "crawler": cadena.href,
                "cadena": cadena.querySelector(".theater-network-name").innerText
            })
        })
        return data;
    });
    await browser.close();
    return result;
}

const getDistritos = async () => {
    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ["--no-sandbox", "--disabled-setupid-sandbox"], 
    });

    const page = await browser.newPage();
    await page.goto("https://www.sensacine.com.mx/cines/");
 
    const linksDist = await page.evaluate( () => {
        const districts = document.querySelectorAll('.mdl-more-item')
        const links = [];
        for (let link of districts) {
            links.push({
                "nombre": link.innerText,
            });
        }
        return links;
    })

    await browser.close();
    return linksDist;
}

const getCines = async (crawlerCineCadena) => {
    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ["--no-sandbox", "--disabled-setupid-sandbox"], 
    });

    const page = await browser.newPage();
    let linkCineCadena = "https://www.sensacine.com.mx/cines/circuitos/" + crawlerCineCadena + "/";
    await page.goto(linkCineCadena);
    await page.waitForSelector("li.hred");
    const paginationLinks = await page.evaluate( link => {
        let pagLinks = [] 
        if (document.querySelector(".button.button-md.item")) {
            const pagination = document.querySelectorAll(".button.button-md.item");
            let paginationLast = pagination[pagination.length - 1];
            for (let i = 1; i <= parseInt(paginationLast.innerText); i++) {
                if (i == 1) {
                    pagLinks.push(link);
                } else {
                    pagLinks.push(link + `?page=${i}`);
                }
            }
        } else {
            pagLinks.push(link);
        }
        return pagLinks
    }, linkCineCadena)

    let cinesDataLinks = [];
    for (let pag of paginationLinks) {
        await page.goto(pag);
        await page.waitForSelector("li.hred");
        const cinesLinks = await page.evaluate( () => {
            const cines = document.querySelectorAll("li.hred");
            let cinesData = [];
            for (let cine of cines) {
                cinesData.push(cine.querySelector('h2.title>a').href)
            }
            return cinesData;
        })
        cinesDataLinks.push(cinesLinks);
    }
    let cinesData = myFlatFunction(cinesDataLinks);
    let cinesDetail = [];
    for (const cineDetail of cinesData) {
        await page.goto(cineDetail);
        await page.waitForSelector(".section-wrap.breadcrumb>a.item");
        const detail = await page.evaluate( linkd => {
            let data = {};
            let breadcrumb = document.querySelectorAll(".section-wrap.breadcrumb>a.item")[3];
            let districtSplit = breadcrumb.innerText.split(" en ");
            let districts = districtSplit[1];
            data.link = linkd;
            data.name = document.querySelector(".theater-cover-title").innerText;
            data.dist = districts;
            data.address = document.querySelector(".theater-cover-adress").innerText;
            return data;
        }, cineDetail);
        cinesDetail.push(detail);
    }
    await browser.close();
    return cinesDetail;
}

function myFlatFunction (input) {
    return input.reduce( function(inputArray , inputToFlat){
        return inputArray.concat(Array.isArray(inputToFlat) ? myFlatFunction(inputToFlat) : inputToFlat );
    }
    ,[]);
}

module.exports = {
    getFunctionsForCine,
    getCinesCadenas,
    getCines,
    getDistritos
}