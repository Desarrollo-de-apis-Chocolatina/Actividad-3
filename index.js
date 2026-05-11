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


// ==========================
// GET 
// ==========================
app.get('/tareas', (req, res) => {
    res.json(tareas);
});


// ==========================
// GET
// ==========================
app.get('/tareas/:id', (req, res) => {

    const tarea = tareas.find(t => t.id == req.params.id);

    if (!tarea) {
        return res.status(404).json({
            mensaje: "Tarea no encontrada"
        });
    }

    res.json(tarea);
});


// ==========================
// POST
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
// PUT 
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
// DELETE BATCH
// ==========================
app.delete('/tareas/batch', (req, res) => {

    const ids = req.body.ids;

    if (!Array.isArray(ids)) {
        return res.status(400).json({
            mensaje: "Debe enviar un arreglo de IDs"
        });
    }

    tareas = tareas.filter(t => !ids.includes(t.id));

    res.json({
        mensaje: "Tareas eliminadas correctamente"
    });
});


// ==========================
// DELETE
// ==========================
app.delete('/tareas/:id', (req, res) => {

    const tarea = tareas.find(t => t.id == req.params.id);

    if (!tarea) {
        return res.status(404).json({
            mensaje: "Tarea no encontrada"
        });
    }

    tareas = tareas.filter(t => t.id != req.params.id);

    res.status(204).send();
});


// ==========================
// POST BATCH
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

app.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});