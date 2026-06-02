import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LayoutDashboard, Users, ShoppingCart, BarChart3, Map as MapIcon, Info, Lightbulb } from 'lucide-react';
import ReactECharts from 'echarts-for-react';

interface KPI {
  total_revenue: number;
  total_customers: number;
  total_orders: number;
  revenue_by_tier: { name: string; value: number }[];
  loyalty_split: { status: string; count: number }[];
}

import * as echarts from 'echarts';

interface GeoData {
  customer_state: string;
  value: number;
}

interface ElbowData {
  k: number[];
  inertia: number[];
}

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'clusters' | 'geospatial' | 'optimality' | 'insights'>('dashboard');
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [clusterData, setClusterData] = useState<any[]>([]);
  const [geoData, setGeoData] = useState<GeoData[]>([]);
  const [elbowData, setElbowData] = useState<ElbowData | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    axios.get('/api/v1/kpi').then(res => setKpi(res.data));
    axios.get('/api/v1/clusters').then(res => setClusterData(res.data));
    axios.get('/api/v1/geospatial').then(res => setGeoData(res.data));
    axios.get('/api/v1/elbow').then(res => setElbowData(res.data));
    
    // Load GeoJSON
    fetch('/brazil_states.json')
      .then(res => res.json())
      .then(json => {
        echarts.registerMap('brazil', json);
        setMapLoaded(true);
      })
      .catch(err => console.error('Kesalahan Pemuatan Peta:', err));
  }, []);

  const elbowOption = {
    title: { text: 'Metode Elbow untuk K Optimal', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: { name: 'Jumlah Klaster (k)', type: 'category', data: elbowData?.k ?? [] },
    yAxis: { name: 'Inersia', type: 'value' },
    series: [
      {
        data: elbowData?.inertia ?? [],
        type: 'line',
        smooth: true,
        marker: 'circle',
        itemStyle: { color: '#6366f1' }
      }
    ]
  };

  const geoOption = {
    title: { text: 'Densitas Penjualan per Negara Bagian', left: 'center' },
    tooltip: { trigger: 'item', formatter: '{b}<br/>Pendapatan: ${c}' },
    visualMap: {
      min: 0,
      max: 1000000,
      left: 'left',
      top: 'bottom',
      text: ['Tinggi', 'Rendah'],
      calculable: true,
      inRange: { color: ['#e0f2fe', '#4f46e5', '#312e81'] }
    },
    series: [
      {
        name: 'Pendapatan',
        type: 'map',
        map: 'brazil',
        roam: true,
        nameProperty: 'sigla',
        emphasis: { label: { show: true } },
        data: geoData.map(d => ({ name: d.customer_state, value: d.value }))
      }
    ]
  };

  const scatterOption = {
    title: { text: 'Segmentasi Pelanggan (K-Means)', left: 'center' },
    tooltip: { trigger: 'item' },
    legend: { bottom: '0', data: ['Tingkat 1', 'Tingkat 2', 'Tingkat 3'] },
    xAxis: { name: 'Transaksi', type: 'value' },
    yAxis: { name: 'Pembayaran', type: 'value' },
    series: [
      {
        name: 'Tingkat 3',
        symbolSize: 5,
        data: Array.isArray(clusterData) ? clusterData.filter(d => d.cluster === 0).map(d => [d.total_transaction_customer, d.total_payment_customer]) : [],
        type: 'scatter',
        itemStyle: { color: '#3b82f6' }
      },
      {
        name: 'Tingkat 2',
        symbolSize: 5,
        data: Array.isArray(clusterData) ? clusterData.filter(d => d.cluster === 1).map(d => [d.total_transaction_customer, d.total_payment_customer]) : [],
        type: 'scatter',
        itemStyle: { color: '#64748b' }
      },
      {
        name: 'Tingkat 1',
        symbolSize: 5,
        data: Array.isArray(clusterData) ? clusterData.filter(d => d.cluster === 2).map(d => [d.total_transaction_customer, d.total_payment_customer]) : [],
        type: 'scatter',
        itemStyle: { color: '#312e81' }
      }
    ]
  };

  const insightLoyaltyOption = {
    title: { text: 'Perilaku Tingkat 3 (Pemisahan Loyalitas)', left: 'center' },
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        data: kpi?.loyalty_split.map(d => ({ name: d.status === 'One-time' ? 'Sekali Beli' : 'Berulang', value: d.count })) ?? [],
        emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
      }
    ]
  };

  const insightRegionalOption = {
    title: { text: '5 Performa Regional Teratas', left: 'center' },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'category', data: geoData.sort((a,b) => b.value - a.value).slice(0,5).map(d => d.customer_state) },
    yAxis: { type: 'value' },
    series: [{ data: geoData.sort((a,b) => b.value - a.value).slice(0,5).map(d => d.value), type: 'bar', itemStyle: { color: '#6366f1' } }]
  };

  const insightRevenueOption = {
    title: { text: 'Dampak Pendapatan per Tingkat', left: 'center' },
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: '50%',
        data: kpi?.revenue_by_tier.map(d => ({ name: d.name.replace('Tier', 'Tingkat'), value: d.value })) ?? [],
        emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
      }
    ]
  };

  const navItemClass = (item: string) => `
    flex items-center space-x-3 p-3 rounded cursor-pointer transition
    ${view === item ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}
  `;

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Bilah Samping */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 text-xl font-bold border-b border-slate-800">Analitik</div>
        <nav className="flex-1 p-4 space-y-2">
          <div className={navItemClass('dashboard')} onClick={() => setView('dashboard')}>
            <LayoutDashboard size={20} />
            <span>Dasbor</span>
          </div>
          <div className={navItemClass('clusters')} onClick={() => setView('clusters')}>
            <BarChart3 size={20} />
            <span>Klaster</span>
          </div>
          <div className={navItemClass('geospatial')} onClick={() => setView('geospatial')}>
            <MapIcon size={20} />
            <span>Geospasial</span>
          </div>
          <div className={navItemClass('optimality')} onClick={() => setView('optimality')}>
            <Info size={20} />
            <span>Optimasi</span>
          </div>
          <div className={navItemClass('insights')} onClick={() => setView('insights')}>
            <Lightbulb size={20} />
            <span>Wawasan</span>
          </div>
        </nav>
        <div className="p-6 border-t border-slate-800 text-xs text-slate-500">
          v1.0.0-korporat
        </div>
      </aside>

      {/* Konten Utama */}
      <main className="flex-1 overflow-y-auto p-8">
        {view === 'dashboard' && (
          <>
            <header className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">Ikhtisar Perusahaan</h1>
              <p className="text-slate-500">Intelijen bisnis waktu nyata.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-500 font-medium">Total Pendapatan</span>
                  <ShoppingCart className="text-indigo-600" size={20} />
                </div>
                <div className="text-3xl font-bold">${kpi?.total_revenue.toLocaleString() ?? '...'}</div>
              </div>
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-500 font-medium">Pelanggan Unik</span>
                  <Users className="text-indigo-600" size={20} />
                </div>
                <div className="text-3xl font-bold">{kpi?.total_customers.toLocaleString() ?? '...'}</div>
              </div>
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-500 font-medium">Total Pesanan</span>
                  <LayoutDashboard className="text-indigo-600" size={20} />
                </div>
                <div className="text-3xl font-bold">{kpi?.total_orders.toLocaleString() ?? '...'}</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-96">
              {mapLoaded ? (
                <ReactECharts option={geoOption} style={{ height: '100%' }} />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">Memuat Peta...</div>
              )}
            </div>
          </>
        )}

        {view === 'clusters' && (
          <div className="h-full">
            <header className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">Analisis Klaster Lanjutan</h1>
              <p className="text-slate-500">Segmentasi perilaku mendalam menggunakan logika K-Means.</p>
            </header>
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-5/6">
              <ReactECharts option={scatterOption} style={{ height: '100%' }} />
            </div>
          </div>
        )}

        {view === 'geospatial' && (
          <div className="h-full">
            <header className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">Distribusi Geospasial</h1>
              <p className="text-slate-500">Densitas penjualan di seluruh negara bagian Brasil.</p>
            </header>
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-5/6">
              {mapLoaded ? (
                <ReactECharts option={geoOption} style={{ height: '100%' }} />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">Memuat Peta...</div>
              )}
            </div>
          </div>
        )}

        {view === 'optimality' && (
          <div className="h-full">
            <header className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">Optimasi Model</h1>
              <p className="text-slate-500">Menentukan jumlah klaster ideal menggunakan Metode Elbow.</p>
            </header>
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-5/6">
              {elbowData ? (
                <ReactECharts option={elbowOption} style={{ height: '100%' }} />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">Memuat Metrik Model...</div>
              )}
            </div>
          </div>
        )}

        {view === 'insights' && (
          <div className="space-y-8">
            <header>
              <h1 className="text-2xl font-bold text-slate-900">Wawasan Strategis</h1>
              <p className="text-slate-500">Kesimpulan berbasis data dan bukti matematis.</p>
            </header>

            <div className="grid grid-cols-1 gap-8">
              {/* Insight 1: Tier 3 Behavior */}
              <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-4">Analisis Perilaku Tingkat 3</h3>
                    <p className="text-slate-600 mb-4">
                      Bukti matematis menunjukkan bahwa pelanggan Tingkat 3 didominasi oleh pembeli satu kali (97,3%). 
                      Segmen ini mewakili peluang terbesar untuk konversi menjadi aliran pendapatan berulang.
                    </p>
                    <div className="bg-slate-50 p-4 rounded border border-slate-100 text-sm text-slate-700">
                      Strategi: Terapkan urutan tindak lanjut otomatis untuk pembeli Tingkat 3 pertama kali.
                    </div>
                  </div>
                  <div className="w-full lg:w-96 h-64">
                    <ReactECharts option={insightLoyaltyOption} style={{ height: '100%' }} />
                  </div>
                </div>
              </div>

              {/* Insight 2: Regional Performance */}
              <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-4">Logika Distribusi Regional</h3>
                    <p className="text-slate-600 mb-4">
                      Wilayah Tenggara menyumbang hampir 20% dari total pendapatan. 
                      Skalasi efisiensi memerlukan diversifikasi performa di 5 negara bagian dengan densitas tinggi yang teridentifikasi.
                    </p>
                    <div className="bg-slate-50 p-4 rounded border border-slate-100 text-sm text-slate-700">
                      Strategi: Kerahkan kampanye pemasaran lokal di SP, RJ, dan MG untuk memperkuat pangsa pasar.
                    </div>
                  </div>
                  <div className="w-full lg:w-96 h-64">
                    <ReactECharts option={insightRegionalOption} style={{ height: '100%' }} />
                  </div>
                </div>
              </div>

              {/* Insight 3: Tier 1 Impact */}
              <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-4">Dampak Pendapatan Tingkat 1</h3>
                    <p className="text-slate-600 mb-4">
                      Meskipun pelanggan Tingkat 1 mencakup kurang dari 1% dari total basis, dampak pendapatan mereka secara eksponensial lebih tinggi (12,4%). 
                      Kesehatan segmen terkait langsung dengan retensi kelompok tingkat atas ini.
                    </p>
                    <div className="bg-slate-50 p-4 rounded border border-slate-100 text-sm text-slate-700">
                      Strategi: Tetapkan saluran dukungan khusus untuk masalah transaksi Tingkat 1.
                    </div>
                  </div>
                  <div className="w-full lg:w-96 h-64">
                    <ReactECharts option={insightRevenueOption} style={{ height: '100%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
