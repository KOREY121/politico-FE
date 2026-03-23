import { Link, useNavigate } from 'react-router-dom';
import { useAuth }           from '../context/useAuth';
import { authAPI }           from '../api/api';

export default function Navbar() {
  const { voter, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await authAPI.logout();
    logout();
    navigate('/');
  }

  return (
    <nav>
      <Link className="nav-logo" to="/">
        INEC<span>Nigeria</span>
      </Link>
      <div className="nav-links">
        {voter && !isAdmin && <Link to="/vote">Cast Vote</Link>}
        <Link to="/results">Results</Link>
        {isAdmin && <Link to="/admin">Admin</Link>}
        {voter && (
          <>
            <span className="nav-user">{voter.full_name}</span>
            <button className="nav-logout" onClick={handleLogout}>Logout</button>
          </>
        )}
        {!voter && <Link to="/">Login</Link>}
      </div>
    </nav>
  );
}