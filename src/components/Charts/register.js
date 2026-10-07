import {
  Chart, ArcElement, BarElement, LineElement, PointElement, CategoryScale,
  LinearScale, Filler, Tooltip, Legend
} from 'chart.js'

// Chart.js 4 is tree-shaken: register what the Bar/Line/Pie wrappers need once
Chart.register(ArcElement, BarElement, LineElement, PointElement, CategoryScale,
  LinearScale, Filler, Tooltip, Legend)
