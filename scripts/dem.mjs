// Wysokości z numerycznego modelu terenu Copernicus GLO-30 (siatka ok. 30 m), bez limitów zapytań.
// Model leży publicznie na Amazon S3 w kafelkach 1°×1° jako "chmurowe" pliki GeoTIFF (COG):
// biblioteka geotiff pobiera z nich tylko potrzebny prostokąt, a nie cały plik.

import { fromUrl } from 'geotiff'

function tileUrl(lat, lon) {
  const ns = `${lat >= 0 ? 'N' : 'S'}${String(Math.abs(lat)).padStart(2, '0')}_00`
  const ew = `${lon >= 0 ? 'E' : 'W'}${String(Math.abs(lon)).padStart(3, '0')}_00`
  const name = `Copernicus_DSM_COG_10_${ns}_${ew}_DEM`
  return `https://copernicus-dem-30m.s3.amazonaws.com/${name}/${name}.tif`
}

/** Wysokości (m, zaokrąglone) dla listy punktów [szerokość, długość, ...]. */
export async function demElevations(list) {
  const out = new Array(list.length)
  // Punkty grupujemy po kafelkach.
  const tiles = new Map()
  list.forEach((p, i) => {
    const key = `${Math.floor(p[0])},${Math.floor(p[1])}`
    if (!tiles.has(key)) tiles.set(key, [])
    tiles.get(key).push(i)
  })
  for (const [key, ids] of tiles) {
    const [tlat, tlon] = key.split(',').map(Number)
    const image = await (await fromUrl(tileUrl(tlat, tlon))).getImage()
    const [x0, y0, x1, y1] = image.getBoundingBox()
    const [W, H] = [image.getWidth(), image.getHeight()]
    // Położenie punktu w pikselach (środek piksela to +0.5).
    const px = (lon) => ((lon - x0) / (x1 - x0)) * W - 0.5
    const py = (lat) => ((y1 - lat) / (y1 - y0)) * H - 0.5
    const xs = ids.map((i) => px(list[i][1]))
    const ys = ids.map((i) => py(list[i][0]))
    const wx0 = Math.max(0, Math.floor(Math.min(...xs)) - 1)
    const wy0 = Math.max(0, Math.floor(Math.min(...ys)) - 1)
    const wx1 = Math.min(W, Math.ceil(Math.max(...xs)) + 2)
    const wy1 = Math.min(H, Math.ceil(Math.max(...ys)) + 2)
    const [raster] = await image.readRasters({ window: [wx0, wy0, wx1, wy1] })
    const ww = wx1 - wx0
    const at = (x, y) => {
      const cx = Math.min(Math.max(x, 0), ww - 1)
      const cy = Math.min(Math.max(y, 0), wy1 - wy0 - 1)
      return raster[cy * ww + cx]
    }
    ids.forEach((i, k) => {
      // Interpolacja dwuliniowa między czterema sąsiednimi pikselami.
      const [x, y] = [xs[k] - wx0, ys[k] - wy0]
      const [fx, fy] = [Math.floor(x), Math.floor(y)]
      const [dx, dy] = [x - fx, y - fy]
      const top = at(fx, fy) * (1 - dx) + at(fx + 1, fy) * dx
      const bottom = at(fx, fy + 1) * (1 - dx) + at(fx + 1, fy + 1) * dx
      out[i] = Math.round(top * (1 - dy) + bottom * dy)
    })
    console.log(`wysokości: kafelek ${key}, ${ids.length} punktów`)
  }
  return out
}
