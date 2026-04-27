import { Link } from 'react-router-dom';
import { getCoverPath } from '../data/games';
import styles from './RecList.module.css';

function RecList({ games }) {
  return (
    <>
      {games.map((g) => (
        <Link to={`/game/${g.id}`} key={g.id} className={styles.recCard}>
          <img
            className={styles.recCover}
            src={getCoverPath(g.id)}
            alt={g.name}
          />
          <div className={styles.recInfo}>
            <div className={styles.recName}>{g.name}</div>
            <div className={styles.recTag}>{g.categoryLabel}</div>
          </div>
        </Link>
      ))}
    </>
  );
}

export default RecList;
