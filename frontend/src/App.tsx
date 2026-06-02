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
      .catch(err => console.error('Map Load Error:', err));
  }, []);

  const elbowOption = {
    title: { text: 'Elbow Method for Optimal K', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: { name: 'Number of Clusters (k)', type: 'category', data: elbowData?.k ?? [] },
    yAxis: { name: 'Inertia', type: 'value' },
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
    title: { text: 'Sales Density by State', left: 'center' },
    tooltip: { trigger: 'item', formatter: '{b}<br/>Revenue: ${c}' },
    visualMap: {
      min: 0,
      max: 1000000,
      left: 'left',
      top: 'bottom',
      text: ['High', 'Low'],
      calculable: true,
      inRange: { color: ['#e0f2fe', '#4f46e5', '#312e81'] }
    },
    series: [
      {
        name: 'Revenue',
        type: 'map',
        map: 'brazil',
        roam: true,
        nameProperty: 'sigla', // Match data name with GeoJSON 'sigla' property
        emphasis: { label: { show: true } },
        data: geoData.map(d => ({ name: d.customer_state, value: d.value }))
      }
    ]
  };

  const scatterOption = {
    title: { text: 'Customer Segmentation (K-Means)', left: 'center' },
    tooltip: { trigger: 'item' },
    legend: { bottom: '0', data: ['Tier 1', 'Tier 2', 'Tier 3'] },
    xAxis: { name: 'Transactions', type: 'value' },
    yAxis: { name: 'Payments', type: 'value' },
    series: [
      {
        name: 'Tier 3',
        symbolSize: 5,
        data: Array.isArray(clusterData) ? clusterData.filter(d => d.cluster === 0).map(d => [d.total_transaction_customer, d.total_payment_customer]) : [],
        type: 'scatter',
        itemStyle: { color: '#3b82f6' } // Blue-500
      },
      {
        name: 'Tier 2',
        symbolSize: 5,
        data: Array.isArray(clusterData) ? clusterData.filter(d => d.cluster === 1).map(d => [d.total_transaction_customer, d.total_payment_customer]) : [],
        type: 'scatter',
        itemStyle: { color: '#64748b' } // Slate-500
      },
      {
        name: 'Tier 1',
        symbolSize: 5,
        data: Array.isArray(clusterData) ? clusterData.filter(d => d.cluster === 2).map(d => [d.total_transaction_customer, d.total_payment_customer]) : [],
        type: 'scatter',
        itemStyle: { color: '#312e81' } // Indigo-900
      }
    ]
  };

  const insightLoyaltyOption = {
    title: { text: 'Tier 3 Behavior (Loyalty Split)', left: 'center' },
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        data: kpi?.loyalty_split.map(d => ({ name: d.status, value: d.count })) ?? [],
        emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
      }
    ]
  };

  const insightRegionalOption = {
    title: { text: 'Top 5 Regional Performance', left: 'center' },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'category', data: geoData.sort((a,b) => b.value - a.value).slice(0,5).map(d => d.customer_state) },
    yAxis: { type: 'value' },
    series: [{ data: geoData.sort((a,b) => b.value - a.value).slice(0,5).map(d => d.value), type: 'bar', itemStyle: { color: '#6366f1' } }]
  };

  const insightRevenueOption = {
    title: { text: 'Revenue Impact by Tier', left: 'center' },
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: '50%',
        data: kpi?.revenue_by_tier.map(d => ({ name: d.name, value: d.value })) ?? [],
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
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 text-xl font-bold border-b border-slate-800">Analytics</div>
        <nav className="flex-1 p-4 space-y-2">
          <div className={navItemClass('dashboard')} onClick={() => setView('dashboard')}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </div>
          <div className={navItemClass('clusters')} onClick={() => setView('clusters')}>
            <BarChart3 size={20} />
            <span>Clusters</span>
          </div>
          <div className={navItemClass('geospatial')} onClick={() => setView('geospatial')}>
            <MapIcon size={20} />
            <span>Geospatial</span>
          </div>
          <div className={navItemClass('optimality')} onClick={() => setView('optimality')}>
            <Info size={20} />
            <span>Optimality</span>
          </div>
          <div className={navItemClass('insights')} onClick={() => setView('insights')}>
            <Lightbulb size={20} />
            <span>Insights</span>
          </div>
        </nav>
        <div className="p-6 border-t border-slate-800 text-xs text-slate-500">
          v1.0.0-corporate
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        {view === 'dashboard' && (
          <>
            <header className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">Enterprise Overview</h1>
              <p className="text-slate-500">Real-time business intelligence.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-500 font-medium">Total Revenue</span>
                  <ShoppingCart className="text-indigo-600" size={20} />
                </div>
                <div className="text-3xl font-bold">${kpi?.total_revenue.toLocaleString() ?? '...'}</div>
              </div>
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-500 font-medium">Unique Customers</span>
                  <Users className="text-indigo-600" size={20} />
                </div>
                <div className="text-3xl font-bold">{kpi?.total_customers.toLocaleString() ?? '...'}</div>
              </div>
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-500 font-medium">Total Orders</span>
                  <LayoutDashboard className="text-indigo-600" size={20} />
                </div>
                <div className="text-3xl font-bold">{kpi?.total_orders.toLocaleString() ?? '...'}</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-96">
              {mapLoaded ? (
                <ReactECharts option={geoOption} style={{ height: '100%' }} />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">Loading Map...</div>
              )}
            </div>
          </>
        )}

        {view === 'clusters' && (
          <div className="h-full">
            <header className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">Advanced Cluster Analysis</h1>
              <p className="text-slate-500">In-depth behavioral segmentation using K-Means logic.</p>
            </header>
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-5/6">
              <ReactECharts option={scatterOption} style={{ height: '100%' }} />
            </div>
          </div>
        )}

        {view === 'geospatial' && (
          <div className="h-full">
            <header className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">Geospatial Distribution</h1>
              <p className="text-slate-500">Sales density across Brazilian states.</p>
            </header>
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-5/6">
              {mapLoaded ? (
                <ReactECharts option={geoOption} style={{ height: '100%' }} />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">Loading Map...</div>
              )}
            </div>
          </div>
        )}

        {view === 'optimality' && (
          <div className="h-full">
            <header className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">Model Optimization</h1>
              <p className="text-slate-500">Determining the ideal number of clusters using the Elbow Method.</p>
            </header>
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-5/6">
              {elbowData ? (
                <ReactECharts option={elbowOption} style={{ height: '100%' }} />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">Loading Model Metrics...</div>
              )}
            </div>
          </div>
        )}

        {view === 'insights' && (
          <div className="space-y-8">
            <header>
              <h1 className="text-2xl font-bold text-slate-900">Strategic Insights</h1>
              <p className="text-slate-500">Data-driven conclusions and mathematical evidence.</p>
            </header>

            <div className="grid grid-cols-1 gap-8">
              {/* Insight 1: Tier 3 Behavior */}
              <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-4">Tier 3 Behavior Analysis</h3>
                    <p className="text-slate-600 mb-4">
                      Mathematical evidence shows that Tier 3 customers are predominantly one-time buyers (97.3%). 
                      This segment represents the greatest opportunity for conversion into recurring revenue streams.
                    </p>
                    <div className="bg-slate-50 p-4 rounded border border-slate-100 text-sm text-slate-700">
                      Strategy: Implement automated follow-up sequences for first-time Tier 3 buyers.
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
                    <h3 className="text-xl font-bold text-slate-900 mb-4">Regional Distribution Logic</h3>
                    <p className="text-slate-600 mb-4">
                      The Southeast region accounts for nearly 20% of total revenue. 
                      Scaling efficiency requires diversifying performance across the top 5 high-density states identified.
                    </p>
                    <div className="bg-slate-50 p-4 rounded border border-slate-100 text-sm text-slate-700">
                      Strategy: Deploy localized marketing campaigns in SP, RJ, and MG to solidify market share.
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
                    <h3 className="text-xl font-bold text-slate-900 mb-4">Tier 1 Revenue Impact</h3>
                    <p className="text-slate-600 mb-4">
                      Although Tier 1 customers comprise less than 1% of the total base, their revenue impact is exponentially higher (12.4%). 
                      Segment health is directly tied to the retention of this top-tier group.
                    </p>
                    <div className="bg-slate-50 p-4 rounded border border-slate-100 text-sm text-slate-700">
                      Strategy: Establish a dedicated support channel for Tier 1 transaction issues.
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
