import { Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { NotFound } from '@/pages/NotFound'
import { routes } from './routes'

export const AppRouter = () => (
  <Routes>
    <Route element={<AppLayout />}>
      {routes.map(route => (
        <Route key={route.path} path={route.path} element={route.element} />
      ))}
      <Route path='*' element={<NotFound />} />
    </Route>
  </Routes>
)
