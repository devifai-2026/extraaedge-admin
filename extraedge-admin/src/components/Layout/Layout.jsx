import Header from './Header'
import Sidebar from './Sidebar'
import './Layout.css'

function Layout({ children }) {
  return (
    <div className="layout-wrapper">
      <Header />
      <div className="layout-container">
        <Sidebar />
        <main className="layout-content">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
