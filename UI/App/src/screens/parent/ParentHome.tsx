import React, { useEffect, useState } from 'react';
import DashboardScreen from '../../components/DashboardScreen';

const filters = ['attendance', 'performance', 'fee status'];

export default function ParentHome() {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(filters[0]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(timer);
  }, [filter]);

  return (
    <DashboardScreen
      title="Parent Dashboard"
      subtitle="Student overview, fee status, attendance and progress."
      role="parent"
      loading={loading}
      loadingLabel="Loading child progress..."
      filter={filter}
      filters={filters}
      onFilterChange={setFilter}
    />
  );
}
