const puppeteer = require('puppeteer');
const moment = require('moment')

const getFunctionsCineHoys = async (crawlerDis, crawler) => {
    const meses = { '01': "enero",'02': "febrero", '03': "marzo", '04': "abril", '05': "mayo", '06': "junio", '07': "julio", '08': "agosto", '09': "septiembre", '10': "octubre", '11': "noviembre", '12': "diciembre" }
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disabled-setupid-sandbox"],
    });
    const page = await browser.newPage()
    await page.goto(`https://cinehoyts.cl/cartelera/${crawlerDis}/${crawler}`, {
        // timeout: 10000,
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
        const teatros = await page.$$(`.divComplejo:not(.locationHide) article.row.tituloPelicula .descripcion.col8`)
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

const getFunctionsCinemark = async (crawler) => {
    const meses = { '01': "ENE.", '02': "FEB.", '03': "MAR.", '04': "ABR.", '05': "MAY.", '06': "JUN.", '07': "JUL.", '08': "AGO.", '09': "SEP.", '10': "OCT.", '11': "NOV.", '12': "DIC." }
    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ["--no-sandbox", "--disabled-setupid-sandbox"], 
    });
    const page = await browser.newPage();
    await page.goto(`https://www.cinemark.cl/cine?tag=${crawler}`, {
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
    // await page.waitForTimeout(1500)
    // await page.waitForSelector(".billboard-days li button")
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

const getFunctionsCineplanet = async (crawler) => {
    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ["--no-sandbox", "--disabled-setupid-sandbox"], 
    });
    const page = await browser.newPage();

    await page.goto(`https://www.cineplanet.cl/cines/${crawler}`, {
        waitUntil: ['domcontentloaded']
    })

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

const getFunctionsCineStar = async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disabled-setupid-sandbox"],
    })
    const page = await browser.newPage()
    await page.goto(`https://cinestar.cl/browsing`)

    await page.waitForSelector("#btnSelectCinema")
    await page.click("#btnSelectCinema")

    await page.waitForTimeout(1500)
    await page.waitForSelector("#cinema-options")
    let cineOptions = await page.$$("#cinema-options a")

    const data = []
    for (let i = 0; i < cineOptions.length; i++) {
        const cine = await page.evaluate( cine => {
            const cineSplit = cine.innerText.split(' - ')
            cine.click()
            return cineSplit[0]
        }, cineOptions[i])
        
        await page.waitForTimeout(1500)
        await page.waitForSelector('#home-now-showing')

        let peliculas = await page.$$("#home-now-showing .movie-container")

        const teatrosObj = []
        for (let p = 0; p < peliculas.length; p++) {
            const pelicula = await page.evaluate( pelicula => {
                const movie = pelicula.querySelector(".title h4").innerText
                const display = pelicula.style.display
                let block = false
                if ( display === 'block' ) {
                    block = true
                    pelicula.querySelector('.poster').click()
                }
                return { nombre: movie, display: block }
            }, peliculas[p])

            if ( !pelicula.display ) continue

            await page.waitForTimeout(2000)

            const horarios = await page.$$(".film-list .film-item.last .film-showtimes .session")
            const horariosObj = []
            for (const horario of horarios) { 
                const horarioRes = await page.evaluate( horario => {
                    const date = horario.getAttribute("data-date")
                    let fechaSplit = date.split("-")
                    let fecha = fechaSplit[0] + "-" + fechaSplit[1] + "-" + fechaSplit[2]
                    const formatos = horario.querySelectorAll(".session-times .session-group")
                    const formatosObj = []
                    for (const formato of formatos) {
                        let formatosplit = formato.querySelector(".attributes .format").innerText.split(" | ")
                        let formatosplit2 = formatosplit[0].split(" ")
                        let formatoText = formatosplit2[2] + " " + formatosplit[1] 
                        const times = formato.querySelectorAll(".session-list a")
                        const timesObj = []
                        for (const time of times) {
                            timesObj.push(time.innerText.replace(/[\n]+/gi, "").trim())
                        }

                        formatosObj.push({ formato: formatoText, times: timesObj })
                    }
                    return { fecha: fecha, formato: formatosObj }
                }, horario)

                horariosObj.push(horarioRes)
            }
            teatrosObj.push({ pelicula: pelicula.nombre, horarios: horariosObj })
            await page.goto("https://cinestar.cl/browsing")
            await page.waitForTimeout(1500)
            await page.waitForSelector("#btnSelectCinema")
            await page.click("#btnSelectCinema")
            peliculas = await page.$$("#home-now-showing .movie-container")
        }

        data.push({ cine: cine, teatros: teatrosObj })
        cineOptions = await page.$$("#cinema-options a")
    }

    await browser.close();
    return data;
}

module.exports = {
    getFunctionsCineHoys,
    getFunctionsCineStar,
    getFunctionsCinemark,
    getFunctionsCineplanet,
}