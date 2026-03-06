type NavigationProps = {
  currentUser?: boolean;
};

export default function Navigation({ currentUser = false }: NavigationProps) {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <a href="/" className="nav-brand">
          <span className="nav-brand-name">Bite&#8209;Sized Club</span>
          <span className="nav-brand-dot" />
        </a>
        <div className="nav-right">
          {!currentUser && (
            <div className="flex gap-2">
              <a href="/auth/login" className="nav-pill">Login</a>
              <a href="/auth/signup" className="nav-pill">Sign Up</a>
            </div>
          )}
          {currentUser && (
            <a href="/profile" className="nav-pill">Profile</a>
          )}
        </div>
      </div>
    </nav>
  );
}
