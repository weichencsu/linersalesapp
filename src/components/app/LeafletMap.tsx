'use client'

import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Customer } from '@/lib/types'
import { withStats } from '@/lib/types'
import { REGION_META, type Region } from '@/lib/regions'
import { fmtMoney } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { useTheme } from 'next-themes'

const REGION_BOUNDS: Record<string, [[number, number], [number, number]]> = {
  ALL: [[-56, -170], [72, 185]],
  APAC: [[-45, 92], [55, 160]],
  CIS: [[23, 37], [72, 136]], // 中国 + 中亚五国 + 俄罗斯/独联体
  EUR: [[34, -11], [71, 45]], // 欧洲大陆（含土耳其）
  AFR: [[-36, -20], [38, 55]], // 非洲大陆
  SAM: [[-57, -93], [21, -34]],
  OTHER: [[-60, -180], [75, 180]],
}

function markerIcon(color: string, size: number, selected: boolean): L.DivIcon {
  const ring = selected
    ? 'box-shadow: 0 0 0 4px rgba(255,255,255,.9), 0 0 0 7px rgba(15,23,42,.35);'
    : 'box-shadow: 0 0 0 2.5px #ffffff, 0 1px 4px rgba(15,23,42,.4);'
  return L.divIcon({
    className: 'mill-marker',
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};${ring}border:2px solid rgba(255,255,255,.85);transition:transform .15s;"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 2],
  })
}

interface FocusRequest {
  customerId: number
  ts: number
}

/** 国家视野：pts = 该国全部客户坐标点；fallback = 无坐标时的国家中心点 */
interface CountryView {
  pts: [number, number][]
  fallback: { center: [number, number]; zoom: number } | null
}

function MapController({
  region,
  country,
  countryView,
  focus,
  markerRefs,
}: {
  region: string
  country: string
  countryView: CountryView | null
  focus: FocusRequest | null
  markerRefs: React.MutableRefObject<Map<number, L.Marker>>
}) {
  const map = useMap()

  // 区域 / 国家视野切换
  useEffect(() => {
    if (country !== 'ALL' && countryView) {
      if (countryView.pts.length > 0) {
        // 有坐标：缩放到该国全部客户数据点
        map.fitBounds(L.latLngBounds(countryView.pts), {
          padding: [50, 50],
          maxZoom: 8,
          animate: true,
        })
        return
      }
      if (countryView.fallback) {
        // 无坐标：按国家中心点定位
        map.flyTo(countryView.fallback.center, countryView.fallback.zoom, { duration: 0.8 })
        return
      }
    }
    const bounds = REGION_BOUNDS[region] ?? REGION_BOUNDS.ALL
    map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [30, 30], animate: true })

  }, [region, country, countryView])

  useEffect(() => {
    if (!focus) return
    const marker = markerRefs.current.get(focus.customerId)
    if (marker) {
      const latlng = marker.getLatLng()
      map.flyTo(latlng, Math.max(map.getZoom(), 5), { duration: 0.8 })
      window.setTimeout(() => marker.openPopup(), 850)
    }

  }, [focus?.ts])

  return null
}

export default function LeafletMap({
  customers,
  region,
  country,
  countryView,
  focus,
  selectedId,
  onSelect,
}: {
  customers: Customer[]
  region: string
  country: string
  countryView: CountryView | null
  focus: FocusRequest | null
  selectedId: number | null
  onSelect: (id: number) => void
}) {
  const markerRefs = useRef<Map<number, L.Marker>>(new Map())
  const { resolvedTheme } = useTheme()
  const { t, regionShort, statusLabel } = useI18n()
  const dark = resolvedTheme === 'dark'
  // 无需 API Key 的 ESRI 灰色底图（浅色/深色）+ 标注层
  const tileBase = dark
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
    : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
  const tileRef = dark
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
    : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
  const attribution = 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, &copy; OpenStreetMap contributors'

  const placed = useMemo(
    () => customers.filter((c) => c.latitude !== null && c.longitude !== null),
    [customers]
  )
  const maxValue = useMemo(
    () => Math.max(1, ...placed.map((c) => withStats(c).totalAnnualValueUsd ?? 0)),
    [placed]
  )

  useEffect(() => {
    // 组件卸载时清理标记引用
    return () => markerRefs.current.clear()
  }, [])

  return (
    <MapContainer
      center={[28, 105]}
      zoom={3}
      minZoom={2}
      maxZoom={12}
      scrollWheelZoom
      style={{ height: '100%', width: '100%', background: '#e8ecef' }}
      attributionControl
    >
      <TileLayer key={`base-${resolvedTheme}`} url={tileBase} attribution={attribution} />
      <TileLayer key={`ref-${resolvedTheme}`} url={tileRef} />
      <MapController region={region} country={country} countryView={countryView} focus={focus} markerRefs={markerRefs} />
      {placed.map((c) => {
        const stats = withStats(c)
        const v = stats.totalAnnualValueUsd ?? 0
        const size = 16 + 22 * Math.sqrt(v / maxValue)
        const color = (REGION_META[c.region as Region] ?? REGION_META.OTHER).color
        return (
          <Marker
            key={c.id}
            position={[c.latitude as number, c.longitude as number]}
            icon={markerIcon(color, Math.round(size), selectedId === c.id)}
            eventHandlers={{ click: () => onSelect(c.id) }}
            ref={(m) => {
              if (m) markerRefs.current.set(c.id, m)
              else markerRefs.current.delete(c.id)
            }}
          >
            <Popup>
              <div className="min-w-[240px]">
                <div className="font-semibold text-[13px] leading-snug">
                  {c.owner}
                  {c.site ? ` · ${c.site}` : ''}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-neutral-600">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: color }}
                  />
                  {c.country} · {regionShort(c.region)} ·{' '}
                  {statusLabel(c.status)}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                  <span className="text-neutral-500">{t('map.popup.millCount')}</span>
                  <span className="text-right font-medium">{t('map.popup.nUnits', { n: stats.millCount })}</span>
                  <span className="text-neutral-500">{t('map.popup.annualValue')}</span>
                  <span className="text-right font-medium">{fmtMoney(stats.totalAnnualValueUsd)}</span>
                </div>
                {c.mills.length > 0 && (
                  <div className="mt-2 border-t border-neutral-200 pt-1.5">
                    <div className="max-h-36 overflow-y-auto text-[11px] leading-relaxed">
                      {c.mills.map((m) => (
                        <div key={m.id} className="flex justify-between gap-2">
                          <span className="truncate text-neutral-700">
                            {m.equipment || m.millType || '—'}
                            {m.millNumber ? ` (${m.millNumber})` : ''}
                          </span>
                          <span className="shrink-0 font-medium">
                            {fmtMoney(m.annualValueUsd)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
