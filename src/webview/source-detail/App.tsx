import React, { useEffect, useState, Suspense } from 'react';
const LazyNewSourceForm = React.lazy(() =>
  import('./NewSourceForm').then((m) => ({ default: m.NewSourceForm })),
);
import { ErrorBoundary } from '../components/ErrorBoundary';
import { vscodeApi } from '../utils/vscode-api';

import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Toolbar } from '../components/Toolbar';
import { PriorityIcon } from '../components/PriorityIcon';
import { StatusDot } from '../components/StatusDot';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import '../global.css';
import './source-detail.css';

export default App;
