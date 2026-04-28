import { useState } from 'react';
import { Menu } from 'antd';
import {
  AppstoreOutlined,
  ThunderboltOutlined,
  AimOutlined,
  ScissorOutlined,
  CoffeeOutlined,
  BuildOutlined,
} from '@ant-design/icons';
import Header from '../components/Header';
import GameGrid from '../components/GameGrid';
import { categories, getGamesByCategory } from '../data/games';
import styles from './HomePage.module.css';

const iconMap = {
  all: <AppstoreOutlined />,
  idle: <ThunderboltOutlined />,
  clicker: <AimOutlined />,
  mowing: <ScissorOutlined />,
  casual: <CoffeeOutlined />,
  tower: <BuildOutlined />,
};

function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredGames = getGamesByCategory(selectedCategory);

  const menuItems = categories.map((cat) => ({
    key: cat.key,
    icon: iconMap[cat.key],
    label: cat.label,
  }));

  return (
    <div className={styles.page}>
      <Header />
      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}>游戏分类</div>
          <Menu
            mode="inline"
            selectedKeys={[selectedCategory]}
            items={menuItems}
            onClick={({ key }) => setSelectedCategory(key)}
            style={{ border: 'none', background: 'transparent' }}
          />
        </aside>
        <main className={styles.content}>
          <GameGrid games={filteredGames} />
        </main>
      </div>
    </div>
  );
}

export default HomePage;
