const puppeteer = require('puppeteer');
const moment = require('moment')

const getFunctionsCineColombia = async (crawlerDist, multiplex, crawler) => {
    const browser = await puppeteer.launch({ 
        headless: true, 
        defaultViewport: null,
        args: ['--window-size=1440,750', "--no-sandbox", "--disabled-setupid-sandbox"], 
    });
    const page = await browser.newPage();
    try {
        await page.goto(`https://www.cinecolombia.com/${crawlerDist}/${multiplex}/${crawler}`, {
            waitUntil: ['domcontentloaded']
        });
        await page.waitForSelector("ul.glide__slides")
    } catch (e) {
        return []
    }
    
    let data = [];
    let filters = await page.$$("li.glide__slide.date-filter__slider-item .radio-button.radio-button--light-blue")
    
    for (let index = 0; index < filters.length; index++) {

        if (index == 1) { break; }

        const date = await page.evaluate( filter => {
            filter.click();
            return filter.querySelector("input").value
        }, filters[index]);
        
        try {
            await page.waitForSelector('div.show-times:not(.show-times--loading)', { timeout: 0 })
        } catch (e) {
            continue
        }

        const notRegisters = await page.$$("div.u-mt-6-mobile")
        if (notRegisters.length !== 0) {
            continue
        }
        
        await page.waitForTimeout(1000)
        const result = await page.evaluate( () => {
            const sectionsCollapses = document.querySelectorAll("section.collapsible.show-times-collapse .collapse");
            if (sectionsCollapses.length > 0) {
                let teatrosObj = [];
                for (let sectionCollapse of sectionsCollapses) {

                    let contentConllapses = sectionCollapse.querySelectorAll(".collapse-content>.show-times-collapse__content");

                    let formatosObj = [];                    
                    for (let contentConllapse of contentConllapses) {
                        let times = contentConllapse.querySelectorAll(".show-times-group__times a");
                        let timesObj = [];
                        for (let time of times) {
                            timesObj.push(time.innerText);
                        }

                        let format = contentConllapse.querySelectorAll(".show-times-group__attrs span");
                        formatosObj.push({
                            "formato": format[0].innerText + ' ' + (format[1].innerText || ''),
                            "times": timesObj
                        });
                    }
                    teatrosObj.push({
                        "pelicula": sectionCollapse.querySelector(".show-times-collapse__header h3").innerText,
                        "horarios": formatosObj
                    })
                }
                return teatrosObj;
            }
        });
        data.push({ fecha: date, teatros: result });
    }

    await browser.close();
    return data;
}

const getFunctionsCinemark = async (crawlerDist, crawler) => {
    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ["--no-sandbox", "--disabled-setupid-sandbox"], 
    });
    const page = await browser.newPage();
    
    try {
        await page.goto(`https://www.cinemark.com.co/ciudad/${crawlerDist}/${crawler}`)
        
        let modalStart = await page.$$(".ant-modal-close");

        if (modalStart.length > 0) {
            await page.click(".ant-modal-close")
        } 

        await page.waitForSelector("div.jsx-281138370.list-movies>.week .week__day")
    } catch (e) {
        return []
    }

    let filters = await page.$$("div.jsx-281138370.list-movies>.week .week__day");
    let data = [];
    let meses = { '01': "ENE", '02': "FEB", '03': "MAR", '04': "ABR", '05': "MAY", '06': "JUN", '07': "JUL", '08': "AGO", '09': "SEP", '10': "OCT", '11': "NOV", '12': "DIC" };

    for (let index = 0; index < filters.length; index++) {

        if (index == 1) { break; }
        
        const date = await page.evaluate( filter => {
            let fecha = filter.querySelector("span.week__date--small-font").innerText;
            filter.click();
            return fecha;
        }, filters[index]);
        
        try {
            await page.waitForSelector('div.week:not(.week--is-disabled)')
        } catch (e) {
            continue
        }

        const notRegisters = await page.$$("div.list-movies div.d-block>h1")
        if (notRegisters.length !== 0) {
            continue
        }
        const result = await page.evaluate( () => {
            const seccionProgramacion = document.querySelectorAll('.section-detail .section-detail__schedule');

            const content = [];
            for (const programacion of seccionProgramacion) {
                const contenedorDetalleTeatro = programacion.querySelectorAll('.theater-detail__container--principal.theater-detail__container--principal__co');
                const teatro = [];
                for (const detalleTeatro of contenedorDetalleTeatro) {
                    const formato = detalleTeatro.querySelectorAll('.theaters-detail__header.theaters-detail__header-co .formats__item');
                    const horas = detalleTeatro.querySelectorAll('.theaters-detail__container>.sessions__button--runtime');

                    const tiempo = [];
                    for (const hora of horas) {
                        tiempo.push(hora.innerText);
                    }           
                    teatro.push({   
                        formato: formato[0].innerText + " " + formato[1].innerText,
                        times: tiempo
                    });
                }
                let peliculaLowerCase = programacion.querySelector("h2.section-detail__title.section-detail__title--bold").innerText.replace("PRE", "");
                content.push({
                    pelicula: peliculaLowerCase.trim(),
                    horarios: teatro
                });
            }
            return content;
        });
        let fechaSplit = date.split(" ");
        let fechaDia = fechaSplit[0];
        let fechaMes = Object.keys(meses).find(key => meses[key] === fechaSplit[1].replace(".", ""));
        let fechaAnio = fechaSplit[2];
        let fecha = fechaAnio + "-" + fechaMes + "-" + fechaDia;
        data.push({ fecha: fecha, teatros: result });
    }
    await browser.close();
    return data;
}

const getFunctionsProcinal = async (crawlerDist, teatro, crawler) => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disabled-setupid-sandbox"],
    });
    const page = await browser.newPage()
    
    try {
        await page.goto(`https://www.procinal.com.co/ciudad/${crawlerDist}/${teatro}/${crawler}`, {
            waitUntil: ['domcontentloaded']
        })
        await page.waitForSelector("#root>div:not(.Intro)")
        await page.waitForSelector("#root>div:nth-child(2):not(.PageLoader)")
    } catch (e) {
        await browser.close()
        return []
    }
    
    let data;
    await page.waitForTimeout(1500)
    const tipoImax = await page.$(".ImaxHeader-container")
    if (!tipoImax) {
        data = await procianlTpl(page)
    } else {
        page.waitForSelector(".ImaxMovies_date-menu .ImaxMovies_date button")
        const filtroFechas = await page.$$(".ImaxMovies_date-menu .ImaxMovies_date button")
        let obj = []

        if (filtroFechas.length > 0) {
            
            let ci = 1

            for (const filtroFecha of filtroFechas) {

                if (ci == 2) { break; }
                ci++
                
                const date = await page.evaluate( filtroFecha => {
                    filtroFecha.click()
                    return filtroFecha.innerText
                }, filtroFecha)
                await page.waitForTimeout(2000)
                const teatros = await page.$$("div.col-sm-6.col-md-4 .ImaxMovies_item")
                const data = []
                for (const teatro of teatros) {
                    const result = await page.evaluate( teatro => {
                        const pelicula = teatro.querySelector(".ImaxMovies_item-title h3").innerText
                        
                        const funciones = teatro.querySelectorAll(".ImaxMovies_row-list")
                        const formatoObj = []
                        for (const funcion of funciones) {
                            const formatoSplit = funcion.querySelector(".ImaxMovies_name").innerText.split(" - ")
                            const formato = formatoSplit[1] + " " + formatoSplit[0]
    
                            const times = funcion.querySelectorAll(".ImaxMovies_showtimes .ImaxMovies_showtimes-list button")
                            const timesObj = []
                            for (const time of times) {
                                const tiempo = time.innerText
                                timesObj.push(tiempo)
                            }
                            formatoObj.push({ formato: formato, times: timesObj })
                        }
                        return { pelicula: pelicula, horarios: formatoObj }
                    }, teatro)
                    data.push(result)
                }
                let fecha = parseDate(date)
                obj.push({ fecha: fecha, teatros: data })
            }
        }
        data = obj
    }
    await browser.close()
    return data
}

async function procianlTpl (page) {
    await page.waitForSelector(".TheaterMovies_date-menu .TheaterMovies_date button")
    const filtroFechas = await page.$$(".TheaterMovies_date-menu .TheaterMovies_date button")
    if (filtroFechas.length > 0) {
        const fn = []

        let ci = 1

        for (const filtroFecha of filtroFechas) {

            if (ci == 2) { break; }
            ci++

            const date = await page.evaluate( filtroFecha => {
                filtroFecha.click()
                return filtroFecha.innerText
            }, filtroFecha)
            await page.waitForTimeout(1000)
            const teatros = await page.$$("div.col-sm-6.col-md-4 .MovieBox.white")
            const data = []
            for (const teatro of teatros) {
                const result = await page.evaluate( teatro => {
                    const pelicula = teatro.querySelector(".MovieBox_title h3").innerText
                    
                    const funciones = teatro.querySelectorAll(".MovieBox_content .TheaterMovies_row-list")
                    const formatoObj = []
                    for (const funcion of funciones) {
                        const formatoSplit = funcion.querySelector(".TheaterMovies_name").innerText.split(" - ")
                        const formato = formatoSplit[1] + " " + formatoSplit[0];

                        const times = funcion.querySelectorAll(".TheaterMovies_showtimes .TheaterMovies_showtimes-list button")
                        const timesObj = []
                        for (const time of times) {
                            const tiempo = time.innerText
                            timesObj.push(tiempo)
                        }
                        formatoObj.push({ formato: formato, times: timesObj })
                    }
                    return { pelicula: pelicula, horarios: formatoObj }
                }, teatro)
                data.push(result)
            }

            let fecha = parseDate(date)

            fn.push({ fecha: fecha, teatros: data })
        }
        return fn
    }
}

function parseDate (date) {
    const meses = { '01': "Ene", '02': "Feb", '03': "Mar", '04': "Abr", '05': "May", '06': "Jun", '07': "Jul", '08': "Ago", '09': "Sep", '10': "Oct", '11': "Nov", '12': "Dic" }
    let dateSlice = date.slice(5, date.length)
    let dateSplit = dateSlice.split(" ")
    let dateDia = dateSplit[1] >= 10 ? dateSplit[1] : "0" + dateSplit[1]
    let dateMes = Object.keys(meses).find(key => meses[key] === dateSplit[0])
    let dateAnio = dateSplit[2]
    let fecha = dateAnio + "-" + dateMes + "-" + dateDia
    return fecha
}

const getFunctionsCinepolis = async (crawlerDist, crawler) => {
    const meses = { '01': "enero", '02': "febrero", '03': "marzo", '04': "abril", '05': "mayo", '06': "junio", '07': "julio", '08': "agosto", '09': "septiembre", '10': "octubre", '11': "noviembre", '12': "diciembre" }
    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: null,
        args: ['--window-size=1200,1080', "--no-sandbox", "--disabled-setupid-sandbox"], 
    });
    const page = await browser.newPage()
    
    try {
        await page.goto(`https://www.cinepolis.com.co/cartelera/${crawlerDist}/${crawler}`, {
        waitUntil: ['domcontentloaded']
        })
        await page.waitForSelector("article.row.tituloPelicula .descripcion.col8", { timeout: 6000 })
    } catch (e) {
        await browser.close();
        return []
    }
    let fechasOption = await page.$$("#cmbFechas option")
    const data = []

    for (let f = 0; f < fechasOption.length; f++) {

        if (f == 1) { break; }

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

module.exports = {
    getFunctionsCineColombia,
    getFunctionsCinemark,
    getFunctionsCinepolis,
    getFunctionsProcinal
}