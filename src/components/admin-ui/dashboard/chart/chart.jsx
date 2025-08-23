'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

function mergeData(visits = [], views = []) {
  if (!Array.isArray(visits) || !Array.isArray(views)) {
    return []
  }

  const mergedData = visits.map(visit => {
    const viewData = views.find(view => view.date === visit.date) || {}

    return {
      ...visit,
      views: viewData.views || 0
    }
  })

  return mergedData
}

function Chart({ visits = [], projectViews = [], analytics = null }) {
  
  if (!visits.length && !projectViews.length) {
    return (
      <div className="h-[450px]">
        <h1 className="mb-5 text-2xl font-light text-white border-b border-grey/20 pb-3">Weekly Recap</h1>
        <div className="flex items-center justify-center h-full">
          <p className="text-textSoft">No data available</p>
        </div>
      </div>
    )
  }

  const sortedVisits = visits.sort((a, b) => new Date(a.date) - new Date(b.date))
  const sortedViews = projectViews.sort((a, b) => new Date(a.date) - new Date(b.date))

  const mergedData = mergeData(sortedVisits, sortedViews)

  return (
    <div className="h-[450px]">
      <h1 className="mb-5 text-2xl font-light text-white border-b border-grey/20 pb-3">Weekly Recap</h1>
      <ResponsiveContainer
        width="100%"
        height="90%"
      >
        <LineChart
          width={500}
          height={300}
          data={mergedData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5
          }}
        >
          <XAxis dataKey="dayName" />
          <YAxis />
          <Tooltip contentStyle={{ background: '#151c2c', border: 'none' }} />
          <Legend />
          <Line
            type="monotone"
            dataKey="visits"
            stroke="#8884d8"
            strokeDasharray="5 5"
          />
          <Line
            type="monotone"
            dataKey="views"
            stroke="#82ca9d"
            strokeDasharray="3 4 5 2"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default Chart
