import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import DecisionSupport from '@/pages/DecisionSupport'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClientInstance}>
    <Router basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<DecisionSupport />} />
        <Route path="/*" element={<DecisionSupport />} />
      </Routes>
    </Router>
  </QueryClientProvider>
)
