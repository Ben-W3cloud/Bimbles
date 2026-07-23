import { Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Landing from './pages/Landing'
import Create from './pages/Create'
import Room from './pages/Room'

export default function App() {
  return (
    <>
      <div className="noise-overlay" />
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/create" element={<Create />} />
          <Route path="/:code" element={<Room />} />
        </Routes>
      </AnimatePresence>
    </>
  )
}
