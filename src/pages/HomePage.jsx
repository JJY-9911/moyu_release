import { useState } from 'react';
import Header from '../components/Header';
import CategoryTabs from '../components/CategoryTabs';
import GameGrid from '../components/GameGrid';
import { categories, getGamesByCategory } from '../data/games';
import styles from './HomePage.module.css';

function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredGames = getGamesByCategory(selectedCategory);

  return (
    <div className={styles.page}>
      <Header />
      <CategoryTabs
        categories={categories}
        selectedCategory={selectedCategory}
        onSelect={setSelectedCategory}
      />
      <GameGrid games={filteredGames} />
    </div>
  );
}

export default HomePage;
