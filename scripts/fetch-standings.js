// scripts/fetch-standings.js
// Node script used by GitHub Action to fetch MPP standings and World Cup schedule
// Dependencies: axios, cheerio

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const OUTPUT_DIR = path.join(__dirname, '..', 'public');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const MPP_URL = 'https://mpp.football/leagues/mpp_challenge_UC8MVG4F';
const WORLD_CUP_JSON = 'https://raw.githubusercontent.com/mjwebmaster/world-cup-2026-schedule-data/main/world-cup-2026-schedule.json';

async function fetchUrl(url) {
  const resp = await axios.get(url, { headers: { 'User-Agent': 'github-action-fetcher/1.0' }, timeout: 20000 });
  return resp.data;
}

function parseTable(html) {
  const $ = cheerio.load(html);
  let best = null;
  $('table').each(function() {
    const rows = $(this).find('tbody tr').length || 0;
    if (!best || rows > best.rows) best = { el: $(this), rows: rows };
  });
  if (!best || best.rows === 0) return null;
  const table = best.el;
  const columns = [];
  table.find('thead th').each(function(i, el) { columns.push($(el).text().trim() || ('col' + (i+1))); });
  if (columns.length === 0) {
    const c = table.find('tbody tr').first().find('td').length || 0;
    for (let i=0;i<c;i++) columns.push('col' + (i+1));
  }
  const standings = [];
  table.find('tbody tr').each(function(i, tr) {
    const row = {};
    $(tr).find('td').each(function(j, td) { row[columns[j] || ('col' + (j+1))] = $(td).text().trim(); });
    const link = $(tr).find('td a').first(); if (link && link.length) row.teamUrl = link.attr('href');
    standings.push(row);
  });
  return { source: MPP_URL, fetchedAt: new Date().toISOString(), columns, standings };
}

async function fetchStandings() {
  console.log('Fetching MPP URL...');
  const html = await fetchUrl(MPP_URL);
  const parsed = parseTable(html);
  if (!parsed) throw new Error('No table parsed from MPP');
  return parsed;
}

async function fetchWorldCup() {
  console.log('Fetching World Cup schedule JSON...');
  const data = await fetchUrl(WORLD_CUP_JSON);
  return { source: WORLD_CUP_JSON, fetchedAt: new Date().toISOString(), data };
}

(async function(){
  try {
    const standings = await fetchStandings();
    fs.writeFileSync(path.join(OUTPUT_DIR, 'standings.json'), JSON.stringify(standings, null, 2), 'utf8');
    console.log('Wrote public/standings.json');
  } catch (e) {
    console.error('Failed to fetch standings:', e && e.stack ? e.stack : e);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'standings.json'), JSON.stringify({ error: String(e), fetchedAt: new Date().toISOString() }, null, 2), 'utf8');
  }

  try {
    const wc = await fetchWorldCup();
    fs.writeFileSync(path.join(OUTPUT_DIR, 'worldcup_schedule.json'), JSON.stringify(wc, null, 2), 'utf8');
    console.log('Wrote public/worldcup_schedule.json');
  } catch (e) {
    console.error('Failed to fetch world cup schedule:', e && e.stack ? e.stack : e);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'worldcup_schedule.json'), JSON.stringify({ error: String(e), fetchedAt: new Date().toISOString() }, null, 2), 'utf8');
  }
})();
