const express = require('express');
const app = express();
const PORT = 3000

app.use(express.json());

// Lista definida de personas asignadas
const asignadosCatalog = [
    { id: 1, nombre: "Alejandra Arriola", email: "alejandra@example.com" },
    { id: 2, nombre: "Alisson Quijano", email: "alisson@example.com" },
    { id: 3, nombre: "Melisa Rivas", email: "melisa@example.com" },
    { id: 4, nombre: "Christian Renderos", email: "christian@example.com" },
    { id: 5, nombre: "Gabriel Martínez", email: "gabriel@example.com" }
];

let tareas = [
    {
        id: 1,
        horaRegistro: "2026-05-13 08:00:00",
        asignado: { id: 2, nombre: "Alisson Quijano", email: "alisson@example.com" },
        peso: 5,
        titulo: "Diseñar API",
        descripcion: "Crear endpoints RESTful para tareas",
        estado: "pendiente"
    }
];

// Formateando el id de las tareas
let nextTareaId = Math.max(0, ...tareas.map(t => Number(t.id) || 0)) + 1;

let comentarios = [];
let historialReasignaciones = [];
let historialCambios = [];

const estadosValidos = ["pendiente", "en_progreso", "bloqueada", "completada"];

const transicionesValidas = {
    pendiente: ["en_progreso"],
    en_progreso: ["bloqueada", "completada"],
    bloqueada: ["en_progreso"],
    completada: []
};

// ==========================
// FUNCIONES DE SOPORTE
// ==========================
function getAsignadoNombre(tarea) {
    // Devuelve el nombre del asignado sin importar si viene como string u objeto
    if (!tarea || tarea.asignado === undefined || tarea.asignado === null) return "";
    if (typeof tarea.asignado === "string") return tarea.asignado;
    if (typeof tarea.asignado === "object" && tarea.asignado.nombre) return tarea.asignado.nombre;
    return String(tarea.asignado);
}

function findAsignadoCatalog(input) {
    // Busca un asignado en el catalogo por id o nombre normalizado
    if (!input) return null;
    if (typeof input === "number") {
        return asignadosCatalog.find(a => a.id === input) || null;
    }
    if (typeof input === "object" && input.id) {
        const byId = asignadosCatalog.find(a => a.id === Number(input.id));
        if (byId) return byId;
    }
    const nombre = typeof input === "string" ? input : (input.nombre || "");
    const norm = normalizeText(nombre);
    return asignadosCatalog.find(a => normalizeText(a.nombre) === norm) || null;
}

function toAsignadoObject(input) {
    // Normaliza cualquier entrada a objeto { id, nombre, email }
    if (!input) return { id: null, nombre: null, email: null };
    const encontrado = findAsignadoCatalog(input);
    if (encontrado) {
        const nombre = typeof input === "string" ? input.trim() : (input.nombre ? input.nombre.trim() : encontrado.nombre);
        return { id: encontrado.id, nombre, email: encontrado.email || null };
    }
    if (typeof input === "string") {
        return { id: null, nombre: input.trim(), email: null };
    }

    return {
        id: input.id || null,
        nombre: input.nombre ? input.nombre.trim() : null,
        email: input.email || null
    };
}

function normalizeText(str) {
    // Normaliza texto para comparaciones (minusculas y sin acentos)
    if (!str) return "";
    return str
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, "");
}

function isAsignadoValido(input) {
    // Valida si el asignado existe en el catalogo
    if (!input) return false;
    return !!findAsignadoCatalog(input);
}

function formatFechaHora(date) {
    // Formatea fecha como YYYY-MM-DD HH:mm:ss
    const d = new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

for (const tarea of tareas) {
    // Normaliza tareas existentes para mantener consistencia
    tarea.asignado = toAsignadoObject(tarea.asignado);
    tarea.horaRegistro = formatFechaHora(tarea.horaRegistro);
}

function paginarResultados(elementos, page = 1, limit = 10) {
    // Aplica paginacion y devuelve metadatos
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
// ENDPOINTS
// ==========================

// ==========================
// GET TAREAS - LISTAR, FILTRAR Y PAGINAR
// ==========================
app.get('/tareas', (req, res) => {
    let resultado = [...tareas];
    const { asignado, peso, desde, hasta, ordenarPor, orden, page, limit } = req.query;

    if (asignado) {
        const normQuery = normalizeText(asignado);
        // Permite filtros parciales
        resultado = resultado.filter(t => normalizeText(getAsignadoNombre(t)).includes(normQuery));
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

        // Ordena por peso o fecha segun los parametros
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

    if (!asignado || !isAsignadoValido(asignado)) {
        return res.status(400).json({ mensaje: "Asignado no válido" });
    }

    if (peso < 1 || peso > 12) {
        return res.status(400).json({
            mensaje: "El peso debe estar entre 1 y 12"
        });
    }

    const nuevaTarea = {
        id: nextTareaId++,
        horaRegistro: formatFechaHora(new Date()),
        asignado: toAsignadoObject(asignado),
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
        const { asignado, peso } = tarea;
        if (!asignado || !isAsignadoValido(asignado) || peso < 1 || peso > 12) {
            return res.status(400).json({
                mensaje: "Todas las tareas deben ser validas para crear el batch"
            });
        }
    }

    for (const tarea of nuevasTareas) {
        const { asignado, peso, titulo, descripcion } = tarea;

        const nuevaTarea = {
            id: nextTareaId++,
            horaRegistro: formatFechaHora(new Date()),
            asignado: toAsignadoObject(asignado),
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
// GET BUSCAR - BÚSQUEDA FULL-TEXT SIMPLE
// ==========================
app.get('/tareas/buscar', (req, res) => {
    const q = req.query.q;
    if (!q || q.trim() === '') return res.status(400).json({ mensaje: 'q es requerido' });

    const tokens = normalizeText(q).split(/\s+/).filter(Boolean);

    const resultados = tareas.filter(t => {
        const haystack = normalizeText((t.descripcion || '') + ' ' + getAsignadoNombre(t));
        return tokens.every(tok => haystack.includes(tok));
    });

    res.json({ datos: resultados, total: resultados.length });
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

    if (asignado && !isAsignadoValido(asignado)) {
        return res.status(400).json({ mensaje: "Asignado no válido" });
    }

    if (peso && (peso < 1 || peso > 12)) {
        return res.status(400).json({
            mensaje: "El peso debe estar entre 1 y 12"
        });
    }

    if (asignado !== undefined) tarea.asignado = toAsignadoObject(asignado);
    tarea.peso = peso || tarea.peso;
    tarea.titulo = titulo || tarea.titulo;
    tarea.descripcion = descripcion || tarea.descripcion;

    // Auditoria
    historialCambios.push({
        id: Date.now(),
        tareaId: tarea.id,
        tipo: 'actualizacion',
        fecha: new Date(),
        cambios: { asignado: getAsignadoNombre(tarea), peso: tarea.peso, titulo: tarea.titulo }
    });

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

    if (!nuevoAsignado || (typeof nuevoAsignado !== "string" && typeof nuevoAsignado !== 'object')) {
        return res.status(400).json({ mensaje: "envie un nuevo asignado (string o objeto)" });
    }

    const nuevoAsignadoObj = toAsignadoObject(nuevoAsignado);

    if (!nuevoAsignadoObj.nombre || !isAsignadoValido(nuevoAsignadoObj)) {
        return res.status(400).json({ mensaje: "el asignado no es valido" });
    }

    const nombreActual = normalizeText(getAsignadoNombre(tarea));
    if (nombreActual === normalizeText(nuevoAsignadoObj.nombre || "")) {
        return res.status(400).json({ mensaje: "la tarea ya esta asignada a esa persona" });
    }

    const cambio = {
        id: Date.now(),
        tareaId: tarea.id,
        tipo: 'reasignacion',
        de: getAsignadoNombre(tarea),
        a: nuevoAsignadoObj.nombre,
        fecha: new Date()
    };

    tarea.asignado = nuevoAsignadoObj;
    historialReasignaciones.push(cambio);
    historialCambios.push(cambio);

    res.json({ mensaje: "tarea reasignada correctamente", cambio, tarea });
});

// ==========================
// POST TRANSICION - CAMBIAR ESTADO
// ==========================
app.post('/tareas/:id/transicionar', (req, res) => {
    const tarea = tareas.find(t => t.id == req.params.id);
    if (!tarea) return res.status(404).json({ mensaje: 'Tarea no encontrada' });

    const { accion, estado } = req.body;
    let nuevoEstado = null;

    const accionMap = { iniciar: 'en_progreso', bloquear: 'bloqueada', completar: 'completada', reabrir: 'pendiente' };

    if (accion) nuevoEstado = accionMap[accion];
    if (estado) nuevoEstado = estado;

    if (!nuevoEstado || !estadosValidos.includes(nuevoEstado)) {
        return res.status(400).json({ mensaje: 'Estado/acción inválida' });
    }

    const actual = tarea.estado || 'pendiente';
    
    // Valida la transicion segun la maquina de estados
    if (!transicionesValidas[actual] || !transicionesValidas[actual].includes(nuevoEstado)) {
        return res.status(400).json({ mensaje: `Transición inválida de ${actual} a ${nuevoEstado}` });
    }

    const cambio = {
        id: Date.now(),
        tareaId: tarea.id,
        tipo: 'estado',
        de: actual,
        a: nuevoEstado,
        fecha: new Date()
    };

    tarea.estado = nuevoEstado;
    historialCambios.push(cambio);

    res.json({ mensaje: 'Estado actualizado', cambio, tarea });
});

// ==========================
// GET HISTORIAL - AUDITORÍA
// ==========================
app.get('/tareas/:id/historial', (req, res) => {
    const tarea = tareas.find(t => t.id == req.params.id);
    if (!tarea) return res.status(404).json({ mensaje: 'Tarea no encontrada' });

    const historial = historialCambios.filter(h => h.tareaId == tarea.id).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    res.json(historial);
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

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
