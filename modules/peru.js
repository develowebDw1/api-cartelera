const puppeteer = require('puppeteer');
const moment = require('moment')

const getFunctionsCineplanet = async (crawler) => {
    const browser = await puppeteer.launch({ 
        headless: true,
        defaultViewport: null,
        args: ['--window-size=1440,1080', "--no-sandbox", "--disabled-setupid-sandbox"],
    });
    const page = await browser.newPage();

    await page.goto(`https://www.cineplanet.com.pe/cinemas/${crawler}`, {
        waitUntil: ['domcontentloaded']
    })

    try {
        await page.waitForSelector('div.autocomplete-container--app>div:nth-child(1):not(.loading)')
    } catch (e) {
        await browser.close();
        return []
    }

    await page.waitForSelector("div.dropdown:nth-child(3) > select:nth-child(3) option")
    const filtroFechas = await page.$$("div.dropdown:nth-child(3) > select:nth-child(3) option")
    const data = []
    for (const filtroFecha of filtroFechas) {
        const date = await page.evaluate( filtroFecha => {
            let fecha = filtroFecha.value.split("T")
            return { f: fecha[0], v: filtroFecha.value }
        }, filtroFecha )
        await page.select("div.dropdown:nth-child(3) > select:nth-child(3)", date.v)

        await page.waitForTimeout(1500)
        const teatros = await page.$$(".movies-list-schedules--item-container .movies-list-schedules--large-item .movies-list-schedules--large-item-content-wrapper")
        const teatrosObj = []
        for (const teatro of teatros) {
            const result = await page.evaluate( teatro => {
                const pelicula = teatro.querySelector(".movies-list-schedules--information .movies-list-schedules--large-movie-description .movies-list-schedules--large-movie-description-top-section .movies-list-schedules--large-movie-description-title").innerText.split(" (R)")[0]
                const formatos = teatro.querySelectorAll(".sessions-details.cinema-showcases--sessions-details")
                const formatosObj = []
                for (const formato of formatos) {
                    const formatoDimension = formato.querySelector(".sessions-details--formats .sessions-details--formats-dimension").innerText
                    const formatoLeguaje = formato.querySelector(".sessions-details--formats .sessions-details--formats-language").innerText
                    const formatoText = formatoDimension + " " + formatoLeguaje
                    const times = formato.querySelectorAll(".showtime-selector.sessions-details--session-item")
                    const timesObj = []
                    for (const time of times) {
                        timesObj.push(time.querySelector(".showtime-selector--wrapper-link button").innerText)
                    }
                    formatosObj.push({ formato: formatoText, times: timesObj })
                }
                return { pelicula: pelicula, horarios: formatosObj }
            }, teatro)
            teatrosObj.push(result)
        }
        data.push({ fecha: date.f, teatros: teatrosObj })
    }
    await browser.close();
    return data;
}

const getFunctionsCinemark = async (crawler) => {
    const meses = { '01': "ENE.", '02': "FEB.", '03': "MAR.", '04': "ABR.", '05': "MAY.", '06': "JUN.", '07': "JUL.", '08': "AGO.", '09': "SEP.", '10': "OCT.", '11': "NOV.", '12': "DIC." }
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ["--no-sandbox", "--disabled-setupid-sandbox"],
    });

    const page = await browser.newPage();

    await page.goto(`https://www.cinemark-peru.com/cine?tag=${crawler}`, {
        waitUntil: ['domcontentloaded']
    })

    await page.waitForTimeout(1500)
    try {
        await page.waitForSelector("#theatre-show>div:nth-child(2):not(.loading-container)")
        await page.waitForSelector(".billboard-days li button")
    } catch (e) {
        await browser.close();
        return [];
    }
    
    // await page.click("div.change-theatre-button button.next")

    const filtroFechas = await page.$$(".billboard-days li button")
    const data = []
    for (const filtroFecha of filtroFechas) {
        const date = await page.evaluate( filtroFecha => {
            filtroFecha.click()
            return filtroFecha.querySelector("h5").innerText
        }, filtroFecha)
        await page.waitForTimeout(2000)
        const teatros = await page.$$(".movies-container .movie-box.row")

        const teatrosObj = []
        for (const teatro of teatros) {
            const result = await page.evaluate( teatro => {
                const pelicula = teatro.querySelector(".movie-schedule>.movie-title>a").innerText
                
                const funciones = teatro.querySelectorAll(".movie-schedule .box-movie-format")
                const formatoObj = []
                for (const funcion of funciones) {
                    const formato1 = funcion.querySelector(".movie-format .movie-lenguaje").innerText
                    const formato2 = funcion.querySelector(".movie-format .movie-version").innerText
                    const formato = formato2 + " " + formato1
                    const times = funcion.querySelectorAll(".movie-times a")
                    const timesObj = []
                    for (const time of times) {
                        timesObj.push(time.innerText)
                    }
                    formatoObj.push({ formato: formato, times: timesObj })
                }
                return { pelicula: pelicula, horarios: formatoObj }
            }, teatro)
            teatrosObj.push(result)
        }
        let fechaSplit = date.split(" ")
        let fechaDia = fechaSplit[0]
        let fechaMes = Object.keys(meses).find(key => meses[key] === fechaSplit[1])
        let fechaAnio = fechaSplit[2]
        let fecha = fechaAnio + "-" + fechaMes + "-" + fechaDia
        data.push({ fecha: fecha, teatros: teatrosObj })
    }

    await browser.close();
    return data;
}

const getFunctionsCinepolis = async (crawlerDist, crawler) => {
    const meses = { '01': "enero", '02': "febrero", '03': "marzo", '04': "abril", '05': "mayo", '06': "junio", '07': "julio", '08': "agosto", '09': "septiembre", '10': "octubre", '11': "noviembre", '12': "diciembre" }
    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: null,
        args: ['--window-size=1200,1080', "--no-sandbox", "--disabled-setupid-sandbox"], 
    });
    const page = await browser.newPage()

    await page.goto(`https://www.cinepolis.com.pe/cartelera/${crawlerDist}/${crawler}`, {
        waitUntil: ['domcontentloaded']
    })

    await page.waitForSelector("article.row.tituloPelicula .descripcion.col8")
    let fechasOption = await page.$$("#cmbFechas option")
    const data = []
    for (let f = 0; f < fechasOption.length; f++) {
        const valorFecha = await page.evaluate( fecha => (fecha) ? fecha.getAttribute("value") : '', fechasOption[f])
        if (valorFecha == "") {
            continue;
        }
        await page.select("#cmbFechas", valorFecha)
        await page.waitForTimeout(1500)
        const teatros = await page.$$("article.row.tituloPelicula .descripcion.col8")
        const teatrosObj = []
        for (const teatro of teatros) {
            const result = await page.evaluate( (teatro) => {
                const pelicula = teatro.querySelector("header h3 a").innerText.replace(" - Vacunados", "")
                                                                            .replace(" XE - Vacunados", "")
                                                                            .replace(" Vacunados", "")
                                                                            .replace("-Vac", "")
                                                                            .replace(" 3D XE - Vac", "")
                                                                            .replace(" - Vac", "")
                                                                            .replace(" 3D - Vac", "")
                                                                            .replace(" 4DX/2D - Vac", "")
                                                                            .replace(" XE", "")
                                                                            .replace(" 3D", "")
                                                                            .replace(" 4DX/2D", "")
                const horarios = teatro.querySelectorAll(".horarioExp")
                const formatosObj = []
                for (const horario of horarios) { // horarios
                    const formato = horario.querySelector(".row .col3.cf").innerText.replace('\n', " ")
                    const times = horario.querySelectorAll(".row .col9 a")
                    const timesObj = []
                    for (const time of times) {
                        const tiempo = time.innerText
                        timesObj.push(tiempo)
                    }
                    formatosObj.push({ formato: formato, times: timesObj })
                }
                return { pelicula: pelicula, horarios: formatosObj }
            }, teatro)
            teatrosObj.push(result)
        }

        let fechaMoment = moment().add(f, 'days')
        let fechaSplit = valorFecha.split(" ")
        let fechaDia = fechaSplit[0]
        let fechaMes = Object.keys(meses).find(key => meses[key] === fechaSplit[1])
        let fechaAnio = fechaMoment.format("YYYY")
        let fecha = fechaAnio + "-" + fechaMes + "-" + fechaDia
        
        data.push({ fecha: fecha, teatros: teatrosObj })
    }
    await browser.close();
    return data;
}

const getFunctionsCineStar = async (crawler) => {
    const meses = { '01': "ene.", '02': "feb.", '03': "mar.", '04': "abr.", '05': "may.", '06': "jun.", '07': "jul.", '08': "ago.", '09': "sep.", '10': "oct.", '11': "nov.", '12': "dic." }

    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: null,
        args: ['--window-size=1440,800', "--no-sandbox", "--disabled-setupid-sandbox"],
    })
    const page = await browser.newPage()
    await page.goto(`https://www.cinestar.com.pe/cines/${crawler}/peliculas`, {
        waitUntil: ['domcontentloaded']
    })

    try {
        await page.waitForSelector('app-cinema-movies>div>div>div>div:not(:nth-child(2))')
    } catch (e) {
        await browser.close();
        return []
    }

    await page.waitForSelector(".scroll-cinema-movies.d-none.d-md-block")
    await page.click(".custom.ng-select.filter.fecha .ng-select-container .ng-value-container")
    let filtroFechas = await page.$$(".ng-dropdown-panel.ng-select-bottom .ng-dropdown-panel-items.scroll-host .ng-option")
    const data = []
    for (let f = 0; f < filtroFechas.length; f++) {
        const date = await page.evaluate( fecha => {
            fecha.click()
            return fecha.querySelector("span").innerText
        }, filtroFechas[f])
        
        await page.waitForSelector(".scroll-cinema-movies.d-none.d-md-block")
        let peliculas = await page.$$("#movies-container app-movie-card>div")

        const teatrosObj = []
        for (let p = 0; p < peliculas.length; p++) {
            const pelicula = await page.evaluate( pelicula => {
                let nombre = pelicula.querySelector("p").innerText.replace(" (HD) (DOB)", "")
                                                                    .replace("(HD) (DOB)", "")
                                                                    .replace(" (HD) (DOB) ", "")
                                                                    .replace(" (HD)(DOB)", "")
                                                                    .replace(" (HD)(DOB) ", "")
                                                                    .replace("(HD) (DOB)", "")
                                                                    .replace("(HD)(D", "")
                                                                    .replace(" OB)", "")
                let formato = "-"
                pelicula.querySelector("button.btn.btn-primary.ft-13").click()
                return { nombre: nombre.trim(), formato: formato }
            }, peliculas[p])

            try {
                // await page.waitForSelector("div.cinema", { timeout: 6000 })
                await page.waitForSelector("div.cinema span.ft-11.color-gray.cursor-pointer.font-helvetica-medium", { timeout: 6000 })
            } catch (error) {
                console.log("Error al cargar horario")
            }
            
            const $times = await page.$$("div.cinema span.ft-11.color-gray.cursor-pointer.font-helvetica-medium")
            const timesObj = []
            for (const time of $times) {
                const resultTime = await page.evaluate( time => {
                    return time.innerText
                }, time)
                timesObj.push(resultTime)
            }
            const horariosObj = [{ formato: pelicula.formato, times: timesObj }]

            teatrosObj.push({ pelicula: pelicula.nombre.replace(/\s+/g, ' ') , horarios: horariosObj })

            await page.goto(`https://www.cinestar.com.pe/cines/${crawler}/peliculas`, {
                waitUntil: ['domcontentloaded']
            })

            await page.waitForSelector(".scroll-cinema-movies.d-none.d-md-block")
            await page.click(".custom.ng-select.filter.fecha .ng-select-container .ng-value-container")
            filtroFechas = await page.$$(".ng-dropdown-panel.ng-select-bottom .ng-dropdown-panel-items.scroll-host .ng-option")
            const date2 = await page.evaluate( fecha => {
                fecha.click()
            }, filtroFechas[f])

            await page.waitForSelector(".scroll-cinema-movies.d-none.d-md-block")
            peliculas = await page.$$("#movies-container app-movie-card>div")
        }

        let fechaMoment = moment().add(f, 'days')
        let fechaSplit = date.split(", ")
        let fechaSplit2 = fechaSplit[1].split(" ")
        let fechaDia = fechaSplit2[0]
        let fechaMes = Object.keys(meses).find(key => meses[key] === fechaSplit2[1])
        let fechaAnio = fechaMoment.format("YYYY")
        let fecha = fechaAnio + "-" + fechaMes + "-" + fechaDia
        data.push({ fecha: fecha, teatros: teatrosObj })

        await page.click(".custom.ng-select.filter.fecha .ng-select-container .ng-value-container")
        filtroFechas = await page.$$(".ng-dropdown-panel.ng-select-bottom .ng-dropdown-panel-items.scroll-host .ng-option")
    }

    await browser.close();
    return data;
}

const getFunctionsMovieTime = async (crawler) => {
    const meses = { '01': "ene.", '02': "feb.", '03': "mar.", '04': "abr.", '05': "may.", '06': "jun.", '07': "jul.", '08': "ago.", '09': "sep.", '10': "oct.", '11': "nov.", '12': "dic." }

    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: null,
        args: ['--window-size=1440,800', "--no-sandbox", "--disabled-setupid-sandbox"],
    })
    const page = await browser.newPage()
    await page.goto(`https://www.movietime.com.pe/cines/${crawler}/peliculas`, {
        waitUntil: ['domcontentloaded']
    })
    
    try {
        await page.waitForSelector('app-cinema-movies>div>div>div>div:not(:nth-child(2))')
    } catch (e) {
        await browser.close();
        return []
    }

    await page.waitForSelector(".scroll-cinema-movies.d-none.d-md-block")
    await page.click(".custom.ng-select.filter.fecha .ng-select-container .ng-value-container")
    let filtroFechas = await page.$$(".ng-dropdown-panel.ng-select-bottom .ng-dropdown-panel-items.scroll-host .ng-option")
    const data = []
    for (let f = 0; f < filtroFechas.length; f++) {
        const date = await page.evaluate( fecha => {
            fecha.click()
            return fecha.querySelector("span").innerText
        }, filtroFechas[f])

        await page.waitForSelector(".scroll-cinema-movies.d-none.d-md-block")
        let peliculas = await page.$$("#movies-container app-movie-card>div")

        const teatrosObj = []
        for (let p = 0; p < peliculas.length; p++) {
            const pelicula = await page.evaluate( pelicula => {
                let nombre = pelicula.querySelector("p").innerText.replace(" (HD) (DOB)", "")
                                                                    .replace("(HD) (DOB)", "")
                                                                    .replace(" (HD) (DOB) ", "")
                                                                    .replace(" (HD)(DOB) ", "")
                                                                    .replace(" (HD)(DOB) ", "")
                                                                    .replace("(HD) (DOB)", "")
                                                                    .replace("(HD)(D", "")
                                                                    .replace(" OB)", "")
                let formato = "-"
                pelicula.querySelector("button.btn.btn-primary.ft-13").click()
                return { nombre: nombre.trim(), formato: formato }
            }, peliculas[p])

            try {
                // await page.waitForSelector("div.cinema", { timeout: 6000 })
                await page.waitForSelector("div.cinema span.ft-11.color-gray.cursor-pointer.font-helvetica-medium", { timeout: 6000 })
            } catch (error) {
                console.log("Error al cargar horario")
            }

            const $times = await page.$$("div.cinema span.ft-11.color-gray.cursor-pointer.font-helvetica-medium")
            const timesObj = []
            for (const time of $times) {
                const resultTime = await page.evaluate( time => {
                    return time.innerText
                }, time)
                timesObj.push(resultTime)
            }
            const horariosObj = [{ formato: pelicula.formato, times: timesObj }]

            teatrosObj.push({ pelicula: pelicula.nombre.replace(/\s+/g, ' '), horarios: horariosObj })

            await page.goto(`https://www.movietime.com.pe/cines/${crawler}/peliculas`, {
                waitUntil: ['domcontentloaded']
            })
            await page.waitForSelector(".scroll-cinema-movies.d-none.d-md-block")
            await page.click(".custom.ng-select.filter.fecha .ng-select-container .ng-value-container")
            filtroFechas = await page.$$(".ng-dropdown-panel.ng-select-bottom .ng-dropdown-panel-items.scroll-host .ng-option")
            const date2 = await page.evaluate( fecha => {
                fecha.click()
            }, filtroFechas[f])

            await page.waitForSelector(".scroll-cinema-movies.d-none.d-md-block")
            peliculas = await page.$$("#movies-container app-movie-card>div")
        }

        let fechaMoment = moment().add(f, 'days')
        let fechaSplit = date.split(", ")
        let fechaSplit2 = fechaSplit[1].split(" ")
        let fechaDia = fechaSplit2[0]
        let fechaMes = Object.keys(meses).find(key => meses[key] === fechaSplit2[1])
        let fechaAnio = fechaMoment.format("YYYY")
        let fecha = fechaAnio + "-" + fechaMes + "-" + fechaDia
        data.push({ fecha: fecha, teatros: teatrosObj })

        await page.click(".custom.ng-select.filter.fecha .ng-select-container .ng-value-container")
        filtroFechas = await page.$$(".ng-dropdown-panel.ng-select-bottom .ng-dropdown-panel-items.scroll-host .ng-option")
    }

    await browser.close();
    return data;
}

const getFunctionsCinerama = async (crawler) => {
    const browser = await puppeteer.launch({
        headless: false,
        args: ["--no-sandbox", "--disabled-setupid-sandbox"],
    })

    const page = await browser.newPage()
    await page.goto(`http://www.cinerama.com.pe/cartelera_cine/${crawler}`, {
        waitUntil: ['domcontentloaded']
    })


    await page.waitForSelector('div.card.mb-3')

    const cards = await page.$$('div.card.mb-3')

    const teatrosObj = [];


    let fecha = moment().format('YYYY-MM-DD');
    const data = [{ fecha: "fecha", teatros: teatrosObj }]

    // await browser.close();
    return data;
}

module.exports = {
    getFunctionsCineplanet,
    getFunctionsCineStar,
    getFunctionsCinemark,
    getFunctionsCinepolis,
    getFunctionsMovieTime,
    getFunctionsCinerama
}