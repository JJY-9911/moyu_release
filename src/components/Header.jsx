import styles from './Header.module.css';

function Header() {
  return (
    <header className={styles.header}>
      <span className={styles.title}>🎮 GameHub</span>
      <span className={styles.subtitle}>轻松玩，随时玩</span>
    </header>
  );
}

export default Header;
