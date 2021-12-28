const puppeteer = require('puppeteer');
const moment = require('moment')

const getFunctionsCinemark = async (district, cine) => {
    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ["--no-sandbox", "--disabled-setupid-sandbox"], 
    });
    const page = await browser.newPage();
    await page.goto(`https://www.cinemark.com.ec/ciudad/${district}/${cine}`);

    await page.waitForSelector('div.week:not(.week--is-disabled)', { timeout: 0 })
    
    let filters = await page.$$("div.list-movies>.week .week__day");
    let data = [];
    let meses = { 01: "ENE", 02: "FEB", 03: "MAR", 04: "ABR", 05: "MAY", 06: "JUN", 07: "JUL", 08: "AGO", 09: "SEP", 10: "OCT", 11: "NOV", 12: "DIC" };

    for (let index = 0; index < filters.length; index++) {
        const date = await page.evaluate( filter => {
            let fecha = filter.querySelector("span.week__date--small-font").innerText;
            filter.click();
            return fecha;
        }, filters[index]);

        try {
            await page.waitForSelector('div.week:not(.week--is-disabled)', { timeout: 0 })
        } catch (e) {
            continue
        }

        const notRegisters = await page.$$("div.week h1>d-block>h1")
        if (notRegisters === 0) {
            continue
        }
        
        const result = await page.evaluate( () => {
            const seccionProgramacion = document.querySelectorAll('.section-detail .section-detail__schedule');

            const content = [];
            for (const programacion of seccionProgramacion) {
                const contenedorDetalleTeatro = programacion.querySelectorAll('.theater-detail__container--principal.theater-detail__container--principal__ec');
                const teatro = [];
                for (const detalleTeatro of contenedorDetalleTeatro) {
                    const formato = detalleTeatro.querySelectorAll('.theaters-detail__header.theaters-detail__header-ec .formats__item');
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
                let pelicula = programacion.querySelector("h2.section-detail__title.section-detail__title--bold").innerText.replace("PRE", "")
                content.push({
                    pelicula: pelicula.trim(),
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

const getFunctionsMulticines = async () => {
    
}

const getFunctionsSuperCines = async () => {
    const meses = { 01: "Enero", 02: "Febrero", 03: "Marzo", 04: "Abril", 05: "Mayo", 06: "Junio", 07: "Julio", 08: "Agosto", 09: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre" }
    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ["--no-sandbox", "--disabled-setupid-sandbox"], 
    });
    const page = await browser.newPage();
    await page.goto(`https://www.supercines.com/busqueda-por-horarios`);
    await page.waitForTimeout(3000)
    await page.waitForSelector("#seleccionadorCiudad")
    const distritos = await page.$$("#seleccionadorCiudad .containerFilterElements button")

    const data = []
    for (const distrito of distritos) {
        await page.evaluate( distrito => {
            distrito.click()
        }, distrito)
        await page.waitForTimeout(1500)

        const complejos = await page.$$("#seleccionadorComplejos .containerFilterElements button")
        for (const complejo of complejos) {
            await page.evaluate( complejo => {
                complejo.click()
            }, complejo)
        }
        await page.waitForTimeout(3000)
        
        const $fechas = await page.$$("#seleccionadorFechas .containerFilterElements button")
        let f = 0
        for (const $fecha of $fechas) {
            const date = await page.evaluate( fecha => {
                fecha.click()
                return fecha.innerText
            }, $fecha)
            await page.waitForTimeout(3000)

            const bphPeliculas = await page.$$("#bphPeliculas>div>div")
            const bphPeliculasHidden = await page.$$("#bphPeliculas #divNoExistenHorarios.hidden")
            const teatrosObj = []
            if (bphPeliculasHidden.length === 1) {
                for (const bphPelicula of bphPeliculas) {
                    const result = await page.evaluate( bphPelicula => {
                        const headerComplexFilter = bphPelicula.querySelectorAll(".HeaderComplexFilter")
                        const cine = headerComplexFilter[0].innerText
                        const busquedaHorarioPeliculaRows = headerComplexFilter[1].querySelectorAll(".busquedaHorarioPeliculaRow>.row")
                        horariosObj = []
                        for (const busquedaHorarioPeliculaRow of busquedaHorarioPeliculaRows) {
                            const pelicula = busquedaHorarioPeliculaRow.querySelector(".col-sm-9 .hidden-xs a").innerText
                            const rowFlexItemSchedules = busquedaHorarioPeliculaRow.querySelectorAll(".row.flex.itemSchedule")
                            const formatosObj = []
                            for (const rowFlexItemSchedule of rowFlexItemSchedules) {
                                const formato = rowFlexItemSchedule.querySelector(".TechScheduleMovieFilter.col-xs-12.col-sm-4>.ScheduleTech").innerText
                                const scheduleMovieFilters = rowFlexItemSchedule.querySelectorAll(".ScheduleMovieFilter a")
                                const timesObj = []
                                for (const scheduleMovieFilter of scheduleMovieFilters) {
                                    timesObj.push(scheduleMovieFilter.innerText)
                                }
                                formatosObj.push({ formato: formato, times: timesObj })
                            }
                            horariosObj.push({ pelicula: pelicula, formatos: formatosObj })
                        }

                        return { cine: cine, horarios: horariosObj }
                    }, bphPelicula)

                    teatrosObj.push(result)
                }
            }

            let fechaMoment = moment().add(f, 'days')

            let fechaSplit1 = date.split(". ")
            let fechaSplit2 = fechaSplit1[1].split(" de ")
            let fechaDia = fechaSplit2[0]
            let fechaMes = Object.keys(meses).find(key => meses[key] === fechaSplit2[1]);
            let fechaAnio = fechaMoment.format("YYYY")
            let fecha = fechaAnio + "-" + fechaMes + "-" + fechaDia

            data.push({ fecha: fecha, teatros: teatrosObj })
            f++
        }
    }

    await browser.close();
    return data;
}

module.exports = {
    getFunctionsCinemark,
    getFunctionsMulticines,
    getFunctionsSuperCines
}