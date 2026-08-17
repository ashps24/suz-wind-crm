'use strict'

/**
 * Wind farm registry API.
 *
 * Advanced I/O function backing `/api/wind-farms` for the Suzlon Wind CRM
 * frontend. Sites live in the Data Store; turbines, alarms, work orders and
 * telemetry stay derived from each site's seed values on the client, so this
 * is deliberately the only table the app writes to.
 *
 *   GET    /wind-farms          list every site
 *   GET    /wind-farms/:siteId  one site
 *   POST   /wind-farms          create (body = SiteSeed shape)
 *   PUT    /wind-farms/:siteId  update
 *   DELETE /wind-farms/:siteId  remove
 */

const express = require('express')
const catalyst = require('zcatalyst-sdk-node')

const TABLE = 'WindFarms'
const app = express()

app.use(express.json({ limit: '256kb' }))

/**
 * CORS is injected by the API Gateway for whitelisted production origins, so
 * these headers exist only for `catalyst serve` on localhost. Setting them for
 * a production origin as well would emit the header twice and the browser
 * rejects that.
 */
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  }
  if (req.method === 'OPTIONS') return res.status(204).end()
  next()
})

/* ------------------------------- mapping -------------------------------- */

const NUM = (v, fallback = 0) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

/** Data Store row -> the SiteSeed shape the frontend already understands. */
function rowToSeed(row) {
  return {
    rowid: String(row.ROWID),
    id: row.SiteId,
    name: row.Name,
    code: row.Code,
    state: row.State,
    district: row.District,
    customerId: row.CustomerId,
    customerName: row.CustomerName,
    position: { lat: NUM(row.Lat), lng: NUM(row.Lng) },
    turbineCount: NUM(row.TurbineCount),
    // Stored comma-separated; empty string must not become ['']
    products: String(row.Products || '').split(',').map((s) => s.trim()).filter(Boolean),
    status: row.Status,
    commissionedOn: row.CommissionedOn,
    gridSubstation: row.GridSubstation,
    evacuationVoltageKv: NUM(row.EvacuationVoltageKv),
    meanWindSpeedMs: NUM(row.MeanWindSpeedMs),
    heroImage: row.HeroImage,
    siteManager: row.SiteManager,
    o_and_mContract: row.OandMContract,
    contractExpiry: row.ContractExpiry,
    stress: NUM(row.Stress),
    bearingDeg: NUM(row.BearingDeg),
  }
}

/** SiteSeed-shaped payload -> Data Store row. */
function seedToRow(body) {
  return {
    SiteId: body.id,
    Name: body.name,
    Code: body.code,
    State: body.state,
    District: body.district,
    CustomerId: body.customerId,
    CustomerName: body.customerName,
    Lat: NUM(body.position && body.position.lat),
    Lng: NUM(body.position && body.position.lng),
    TurbineCount: NUM(body.turbineCount),
    Products: Array.isArray(body.products) ? body.products.join(',') : String(body.products || ''),
    Status: body.status,
    CommissionedOn: body.commissionedOn,
    GridSubstation: body.gridSubstation,
    EvacuationVoltageKv: NUM(body.evacuationVoltageKv),
    MeanWindSpeedMs: NUM(body.meanWindSpeedMs),
    HeroImage: body.heroImage,
    SiteManager: body.siteManager,
    OandMContract: body.o_and_mContract,
    ContractExpiry: body.contractExpiry,
    Stress: NUM(body.stress),
    BearingDeg: NUM(body.bearingDeg),
  }
}

/** ZCQL returns each row wrapped in the table name — unwrap before use. */
const unwrap = (rows) => rows.map((r) => r[TABLE] || r)

const esc = (v) => String(v == null ? '' : v).replace(/'/g, "''")

/** Required fields, and the shape the map depends on being numeric. */
function validate(body) {
  const errors = []
  for (const f of ['id', 'name', 'state', 'district']) {
    if (!body[f] || !String(body[f]).trim()) errors.push(`${f} is required`)
  }
  if (!/^[a-z0-9-]+$/.test(String(body.id || ''))) {
    errors.push('id must be lowercase letters, digits and hyphens')
  }
  const lat = NUM(body.position && body.position.lat, NaN)
  const lng = NUM(body.position && body.position.lng, NaN)
  // Bounds of the projection the India map is drawn against.
  if (!(lat >= 6 && lat <= 37.5)) errors.push('latitude must be between 6 and 37.5')
  if (!(lng >= 67 && lng <= 98.5)) errors.push('longitude must be between 67 and 98.5')
  const count = NUM(body.turbineCount, NaN)
  if (!(count >= 1 && count <= 200)) errors.push('turbineCount must be between 1 and 200')
  return errors
}

/* -------------------------------- routes -------------------------------- */

const table = (req) => catalyst.initialize(req).datastore().table(TABLE)
const zcql = (req) => catalyst.initialize(req).zcql()

app.get('/wind-farms', async (req, res) => {
  try {
    const rows = await zcql(req).executeZCQLQuery(
      `SELECT ROWID, SiteId, Name, Code, State, District, CustomerId, CustomerName, Lat, Lng,
              TurbineCount, Products, Status, CommissionedOn, GridSubstation, EvacuationVoltageKv,
              MeanWindSpeedMs, HeroImage, SiteManager, OandMContract, ContractExpiry, Stress, BearingDeg
       FROM ${TABLE} ORDER BY Name LIMIT 300`,
    )
    res.status(200).json({ sites: unwrap(rows).map(rowToSeed) })
  } catch (err) {
    res.status(500).json({ error: 'Could not read the wind farm registry', detail: String(err && err.message) })
  }
})

app.get('/wind-farms/:siteId', async (req, res) => {
  try {
    const rows = await zcql(req).executeZCQLQuery(
      `SELECT * FROM ${TABLE} WHERE SiteId = '${esc(req.params.siteId)}' LIMIT 1`,
    )
    const list = unwrap(rows)
    if (!list.length) return res.status(404).json({ error: 'No such wind farm' })
    res.status(200).json({ site: rowToSeed(list[0]) })
  } catch (err) {
    res.status(500).json({ error: 'Could not read that wind farm', detail: String(err && err.message) })
  }
})

app.post('/wind-farms', async (req, res) => {
  const body = req.body || {}
  const errors = validate(body)
  if (errors.length) return res.status(400).json({ error: 'Validation failed', errors })

  try {
    const existing = await zcql(req).executeZCQLQuery(
      `SELECT ROWID FROM ${TABLE} WHERE SiteId = '${esc(body.id)}' LIMIT 1`,
    )
    if (unwrap(existing).length) {
      return res.status(409).json({ error: `A wind farm with id "${body.id}" already exists` })
    }
    const inserted = await table(req).insertRow(seedToRow(body))
    res.status(201).json({ site: rowToSeed(inserted) })
  } catch (err) {
    res.status(500).json({ error: 'Could not create the wind farm', detail: String(err && err.message) })
  }
})

app.put('/wind-farms/:siteId', async (req, res) => {
  const body = req.body || {}
  const errors = validate({ ...body, id: req.params.siteId })
  if (errors.length) return res.status(400).json({ error: 'Validation failed', errors })

  try {
    const found = await zcql(req).executeZCQLQuery(
      `SELECT ROWID FROM ${TABLE} WHERE SiteId = '${esc(req.params.siteId)}' LIMIT 1`,
    )
    const list = unwrap(found)
    if (!list.length) return res.status(404).json({ error: 'No such wind farm' })

    const updated = await table(req).updateRow({
      ROWID: list[0].ROWID,
      ...seedToRow({ ...body, id: req.params.siteId }),
    })
    res.status(200).json({ site: rowToSeed(updated) })
  } catch (err) {
    res.status(500).json({ error: 'Could not update the wind farm', detail: String(err && err.message) })
  }
})

app.delete('/wind-farms/:siteId', async (req, res) => {
  try {
    const found = await zcql(req).executeZCQLQuery(
      `SELECT ROWID FROM ${TABLE} WHERE SiteId = '${esc(req.params.siteId)}' LIMIT 1`,
    )
    const list = unwrap(found)
    if (!list.length) return res.status(404).json({ error: 'No such wind farm' })
    await table(req).deleteRow(list[0].ROWID)
    res.status(200).json({ deleted: req.params.siteId })
  } catch (err) {
    res.status(500).json({ error: 'Could not delete the wind farm', detail: String(err && err.message) })
  }
})

app.use((_req, res) => res.status(404).json({ error: 'Unknown route' }))

module.exports = app
