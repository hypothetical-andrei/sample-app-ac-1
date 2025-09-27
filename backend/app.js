import express from 'express'
import { Sequelize, DataTypes, Op } from 'sequelize'

const app = express()
const port = process.env.PORT || 3000

// --- db setup (SQLite file: kittens.sqlite) ---
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './kittens.sqlite',
  logging: false
})

const Kitten = sequelize.define('Kitten', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true, len: [1, 100] }
  },
  color: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true, len: [1, 50] }
  },
  weight: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: { isFloat: true, min: 0.1, max: 50 }
  }
}, {
  tableName: 'kittens',
  timestamps: true
})

// --- middleware ---
app.use((req, res, next) => {
  console.warn(`${req.method} ${req.url}`)
  next()
})

app.use(express.json())

// simple health check
app.get('/status', (req, res) => {
  res.json({ ok: true })
})

// --- CRUD routes ---
// create
app.post('/kittens', async (req, res, next) => {
  try {
    const { name, color, weight } = req.body
    const kitten = await Kitten.create({ name, color, weight })
    res.status(201).json(kitten)
  } catch (err) {
    next(err)
  }
})

// read list with basic filters + pagination
app.get('/kittens', async (req, res, next) => {
  try {
    const rows = await Kitten.findAll({})
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

// read one
app.get('/kittens/:id', async (req, res, next) => {
  try {
    const kitten = await Kitten.findByPk(req.params.id)
    if (!kitten) return res.status(404).json({ error: 'not found' })
    res.json(kitten)
  } catch (err) {
    next(err)
  }
})

// update (partial)
app.put('/kittens/:id', async (req, res, next) => {
  try {
    const kitten = await Kitten.findByPk(req.params.id)
    if (!kitten) return res.status(404).json({ error: 'not found' })
    const { name, color, weight } = req.body
    if (name !== undefined) kitten.name = name
    if (color !== undefined) kitten.color = color
    if (weight !== undefined) kitten.weight = weight
    await kitten.save()
    res.json(kitten)
  } catch (err) {
    next(err)
  }
})

// delete
app.delete('/kittens/:id', async (req, res, next) => {
  try {
    const count = await Kitten.destroy({ where: { id: req.params.id } })
    if (!count) return res.status(404).json({ error: 'not found' })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

// --- error handler (sequelize validation friendly) ---
app.use((err, req, res, next) => {
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'validation_failed',
      details: err.errors.map(e => ({ field: e.path, message: e.message }))
    })
  }
  console.error(err)
  res.status(500).json({ error: 'internal_error' })
})

// --- start ---
async function start() {
  await sequelize.authenticate()
  await sequelize.sync()
  app.listen(port, () => {
    console.log(`kittens api listening on http://localhost:${port}`)
  })
}

start().catch(err => {
  console.error('failed to start', err)
  process.exit(1)
})
