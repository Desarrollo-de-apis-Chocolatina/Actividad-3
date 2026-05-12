const express = require('express');
const app = express();

app.use(express.json());

const asignadosValidos = [
    "alejandra arriola",
    "alisson quijano",
    "melisa rivas",
    "christian renderos",
    "gabriel martínez"
];

let tareas = [
    {
        id: 1,
        horaRegistro: new Date(),
        asignado: "Alisson Quijano",
        peso: 5,
        titulo: "Diseñar API",
        descripcion: "Crear endpoints RESTful para tareas"
    }
];

let comentarios = [];
let historialReasignaciones = [];

function paginarResultados(elementos, page = 1, limit = 10) {
    const pagina = Number(page);
    const limite = Number(limit);

    if (!Number.isInteger(pagina) || pagina < 1) {
        return {
            error: "el numero de pagina debe ser un entero mayor o igual a 1"
        };
    }

    if (!Number.isInteger(limite) || limite < 1) {
        return {
            error: "el limite debe ser un entero mayor o igual a 1"
        };
    }

    const total = elementos.length;
    const totalPaginas = Math.ceil(total / limite);
    const inicio = (pagina - 1) * limite;
    const fin = inicio + limite;

    return {
        datos: elementos.slice(inicio, fin),
        metadata: {
            total,
            totalPaginas,
            pagina,
            limite,
            tieneSiguiente: pagina < totalPaginas
        }
    };
}
// ==========================
// GET TAREAS - LISTAR, FILTRAR Y PAGINAR
// ==========================
app.get('/tareas', (req, res) => {
    let resultado = [...tareas];
    const { asignado, peso, desde, hasta, ordenarPor, orden, page, limit } = req.query;

    if (asignado) {
        resultado = resultado.filter(t =>
            t.asignado.toLowerCase() === asignado.toLowerCase()
        );
    }

    if (peso) {
        const pesoNumero = Number(peso);

        if (isNaN(pesoNumero)) {
            return res.status(400).json({
                mensaje: "el peso debe ser un numero"
            });
        }

        resultado = resultado.filter(t => t.peso === pesoNumero);
    }

    if (desde) {
        const fechaDesde = new Date(desde);

        if (isNaN(fechaDesde.getTime())) {
            return res.status(400).json({
                mensaje: "desde debe ser una fecha valida"
            });
        }

        resultado = resultado.filter(t => new Date(t.horaRegistro) >= fechaDesde);
    }

    if (hasta) {
        const fechaHasta = new Date(hasta);

        if (isNaN(fechaHasta.getTime())) {
            return res.status(400).json({
                mensaje: "hasta debe ser una fecha valida"
            });
        }

        resultado = resultado.filter(t => new Date(t.horaRegistro) <= fechaHasta);
    }

    if (orden && !ordenarPor) {
        return res.status(400).json({
            mensaje: "para ordenar, primero indique ordenar si por peso o por fecha"
        });
    }

    if (ordenarPor) {
        if (ordenarPor !== "peso" && ordenarPor !== "fecha") {
            return res.status(400).json({
                mensaje: "ordenarPor debe ser peso o fecha"
            });
        }

        if (orden && orden !== "asc" && orden !== "desc") {
            return res.status(400).json({
                mensaje: "orden debe ser asc o desc"
            });
        }

        const direccion = orden === "desc" ? -1 : 1;

        resultado.sort((a, b) => {
            const valorA = ordenarPor === "peso" ? a.peso : new Date(a.horaRegistro).getTime();
            const valorB = ordenarPor === "peso" ? b.peso : new Date(b.horaRegistro).getTime();

            return (valorA - valorB) * direccion;
        });
    }

    const resultadoPaginado = paginarResultados(resultado, page, limit);

    if (resultadoPaginado.error) {
        return res.status(400).json({
            mensaje: resultadoPaginado.error
        });
    }

    res.json(resultadoPaginado);
});

// ==========================
// POST TAREA - CREAR UNA TAREA
// ==========================
app.post('/tareas', (req, res) => {

    const { asignado, peso, titulo, descripcion } = req.body;

    // Validar asignado
    if (!asignadosValidos.includes(asignado.toLowerCase())) {
        return res.status(400).json({
            mensaje: "Asignado no válido"
        });
    }

    // Validar peso
    if (peso < 1 || peso > 12) {
        return res.status(400).json({
            mensaje: "El peso debe estar entre 1 y 12"
        });
    }

    const nuevaTarea = {
        id: Date.now(),
        horaRegistro: new Date(),
        asignado,
        peso,
        titulo,
        descripcion
    };

    tareas.push(nuevaTarea);

    res.status(201).json(nuevaTarea);
});

// ==========================
// POST BATCH - CREAR VARIAS TAREAS
// ==========================
app.post('/tareas/batch', (req, res) => {

    const nuevasTareas = req.body;

    if (!Array.isArray(nuevasTareas)) {
        return res.status(400).json({
            mensaje: "Debe enviar un arreglo de tareas"
        });
    }

    const tareasAgregadas = [];

    for (const tarea of nuevasTareas) {

        const { asignado, peso, titulo, descripcion } = tarea;

        if (
            !asignadosValidos.includes(asignado.toLowerCase()) ||
            peso < 1 ||
            peso > 12
        ) {
            continue;
        }

        const nuevaTarea = {
            id: Date.now() + Math.random(),
            horaRegistro: new Date(),
            asignado,
            peso,
            titulo,
            descripcion
        };

        tareas.push(nuevaTarea);
        tareasAgregadas.push(nuevaTarea);
    }

    res.status(201).json(tareasAgregadas);
});

// ==========================
// DELETE BATCH - ELIMINAR VARIAS TAREAS
// ==========================
app.delete('/tareas/batch', (req, res) => {

    const ids = req.body.ids;

    if (!Array.isArray(ids)) {
        return res.status(400).json({
            mensaje: "Debe enviar un arreglo de IDs"
        });
    }

    tareas = tareas.filter(t => !ids.includes(t.id));
    comentarios = comentarios.filter(c => !ids.includes(c.tareaId));

    res.json({
        mensaje: "Tareas eliminadas correctamente"
    });
});

// ==========================
// GET TAREA - OBTENER UNA TAREA
// ==========================
app.get('/tareas/:id', (req, res) => {

    const tarea = tareas.find(t => t.id == req.params.id);

    if (!tarea) {
        return res.status(404).json({
            mensaje: "tarea no encontrada"
        });
    }

    res.json(tarea);
});

// ==========================
// PUT TAREA - ACTUALIZAR UNA TAREA
// ==========================
app.put('/tareas/:id', (req, res) => {

    const tarea = tareas.find(t => t.id == req.params.id);

    if (!tarea) {
        return res.status(404).json({
            mensaje: "Tarea no encontrada"
        });
    }

    const { asignado, peso, titulo, descripcion } = req.body;

    if (asignado && !asignadosValidos.includes(asignado.toLowerCase())) {
        return res.status(400).json({
            mensaje: "Asignado no válido"
        });
    }

    if (peso && (peso < 1 || peso > 12)) {
        return res.status(400).json({
            mensaje: "El peso debe estar entre 1 y 12"
        });
    }

    tarea.asignado = asignado || tarea.asignado;
    tarea.peso = peso || tarea.peso;
    tarea.titulo = titulo || tarea.titulo;
    tarea.descripcion = descripcion || tarea.descripcion;

    res.json(tarea);
});

// ==========================
// PATCH TAREA - REASIGNAR TAREA
// ==========================
app.patch('/tareas/:id/asignado', (req, res) => {

    const tarea = tareas.find(t => t.id == req.params.id);

    if (!tarea) {
        return res.status(404).json({
            mensaje: "tarea no encontrada"
        });
    }

    const { nuevoAsignado } = req.body;

    if (!nuevoAsignado || typeof nuevoAsignado !== "string" || nuevoAsignado.trim() === "") {
        return res.status(400).json({
            mensaje: "envie un nuevo asignado"
        });
    }

    const asignadoNormalizado = nuevoAsignado.trim();

    if (!asignadosValidos.includes(asignadoNormalizado.toLowerCase())) {
        return res.status(400).json({
            mensaje: "el asignado no es valido"
        });
    }

    if (tarea.asignado.toLowerCase() === asignadoNormalizado.toLowerCase()) {
        return res.status(400).json({
            mensaje: "la tarea ya esta asignada a esa persona"
        });
    }

    const cambio = {
        id: Date.now(),
        tareaId: tarea.id,
        de: tarea.asignado,
        a: asignadoNormalizado,
        fecha: new Date()
    };

    tarea.asignado = asignadoNormalizado;
    historialReasignaciones.push(cambio);

    res.json({
        mensaje: "tarea reasignada correctamente",
        cambio,
        tarea
    });
});

// ==========================
// DELETE TAREA - ELIMINAR UNA TAREA
// ==========================
app.delete('/tareas/:id', (req, res) => {

    const tarea = tareas.find(t => t.id == req.params.id);

    if (!tarea) {
        return res.status(404).json({
            mensaje: "Tarea no encontrada"
        });
    }

    tareas = tareas.filter(t => t.id != req.params.id);
    comentarios = comentarios.filter(c => c.tareaId != req.params.id);

    res.status(204).send();
});

// ==========================
// POST COMENTARIO - CREAR COMENTARIO
// ==========================
app.post('/tareas/:tareaId/comentarios', (req, res) => {

    const tarea = tareas.find(t => t.id == req.params.tareaId);

    if (!tarea) {
        return res.status(404).json({
            mensaje: "Tarea no encontrada"
        });
    }

    const { texto, autor } = req.body;

    if (!texto || typeof texto !== "string" || texto.trim() === "") {
        return res.status(400).json({
            mensaje: "El texto del comentario es obligatorio"
        });
    }

    const nuevoComentario = {
        id: Date.now(),
        tareaId: tarea.id,
        texto: texto.trim(),
        autor: autor || "Anónimo",
        horaRegistro: new Date()
    };

    comentarios.push(nuevoComentario);

    res.status(201).json(nuevoComentario);
});

// ==========================
// GET COMENTARIOS - LISTAR COMENTARIOS DE UNA TAREA
// ==========================
app.get('/tareas/:tareaId/comentarios', (req, res) => {

    const tarea = tareas.find(t => t.id == req.params.tareaId);

    if (!tarea) {
        return res.status(404).json({
            mensaje: "Tarea no encontrada"
        });
    }

    const comentariosDeTarea = comentarios.filter(c => c.tareaId == tarea.id);

    res.json(comentariosDeTarea);
});

// ==========================
// GET COMENTARIO - OBTENER UN COMENTARIO
// ==========================
app.get('/tareas/:tareaId/comentarios/:comentarioId', (req, res) => {

    const tarea = tareas.find(t => t.id == req.params.tareaId);

    if (!tarea) {
        return res.status(404).json({
            mensaje: "Tarea no encontrada"
        });
    }

    const comentario = comentarios.find(c =>
        c.tareaId == tarea.id && c.id == req.params.comentarioId
    );

    if (!comentario) {
        return res.status(404).json({
            mensaje: "Comentario no encontrado"
        });
    }

    res.json(comentario);
});

// ==========================
// PUT COMENTARIO - ACTUALIZAR UN COMENTARIO
// ==========================
app.put('/tareas/:tareaId/comentarios/:comentarioId', (req, res) => {

    const tarea = tareas.find(t => t.id == req.params.tareaId);

    if (!tarea) {
        return res.status(404).json({
            mensaje: "Tarea no encontrada"
        });
    }

    const comentario = comentarios.find(c =>
        c.tareaId == tarea.id && c.id == req.params.comentarioId
    );

    if (!comentario) {
        return res.status(404).json({
            mensaje: "Comentario no encontrado"
        });
    }

    const { texto, autor } = req.body;

    if (texto !== undefined && (typeof texto !== "string" || texto.trim() === "")) {
        return res.status(400).json({
            mensaje: "El texto del comentario no puede estar vacío"
        });
    }

    if (autor !== undefined && (typeof autor !== "string" || autor.trim() === "")) {
        return res.status(400).json({
            mensaje: "El autor del comentario no puede estar vacío"
        });
    }

    if (texto !== undefined) {
        comentario.texto = texto.trim();
    }

    if (autor !== undefined) {
        comentario.autor = autor.trim();
    }

    res.json(comentario);
});

// ==========================
// DELETE COMENTARIO - ELIMINAR UN COMENTARIO
// ==========================
app.delete('/tareas/:tareaId/comentarios/:comentarioId', (req, res) => {

    const tarea = tareas.find(t => t.id == req.params.tareaId);

    if (!tarea) {
        return res.status(404).json({
            mensaje: "Tarea no encontrada"
        });
    }

    const comentario = comentarios.find(c =>
        c.tareaId == tarea.id && c.id == req.params.comentarioId
    );

    if (!comentario) {
        return res.status(404).json({
            mensaje: "Comentario no encontrado"
        });
    }

    comentarios = comentarios.filter(c => c.id != req.params.comentarioId);

    res.status(204).send();
});

app.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});