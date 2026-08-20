import { RouterProvider } from 'react-router'
import { router } from './app/router'
import ToastViewport from './shared/components/ToastViewport'

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <ToastViewport />
    </>
  )
}

export default App
