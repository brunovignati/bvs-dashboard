import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import DecisionSupport from '@/pages/DecisionSupport'
import Dashboard from '@/pages/Dashboard'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClientInstance}>
    <Router basename={import.meta.env.BASE_URL}>
      <Routes>
        {/* Nuevo Decision Support System (vista principal) */}
        <Route path="/" element={<DecisionSupport />} />
        {/* Dashboard clásico conservado, reversible */}
        <Route path="/legacy/*" element={<Dashboard />} />
        {/* Cualquier otra ruta → DSS */}
        <Route path="/*" element={<DecisionSupport />} />
      </Routes>
    </Router>
  </QueryClientProvider>
)
