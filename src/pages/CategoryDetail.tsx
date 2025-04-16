import { useState, useEffect, useRef } from 'react';
import annotationPlugin from 'chartjs-plugin-annotation';
import { useParams, Link } from 'react-router-dom';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { ChevronLeft, Search, ArrowUpIcon, ArrowDownIcon, MinusIcon } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem,
  ArcElement,
} from 'chart.js';
import { loadData } from '../utils/dataLoader';
import type { MonitoringData } from '../types';
import { format, parseISO } from 'date-fns';
import { LoadingSpinner } from '../components/LoadingSpinner';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  annotationPlugin
);

const API_BASE_URL = 'https://dashboard-backend-8spg.onrender.com/api'; // Change this URL as needed

// Add these type definitions after the imports
type Card = {
  title: string;
  value: string;
  unit: string;
  description: string;
  trend: 'up' | 'down' | 'neutral';
};

type ChartConfig = {
  chartType: 'line' | 'bar' | 'pie';
  title: string;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
  }[];
  options: any;
};

type DisplayConfig = {
  displayType: 'chart' | 'cards';
  chartConfig?: ChartConfig;
  cards?: Card[];
};

type GeneratedResponse = {
  displayConfig: DisplayConfig;
};

export function CategoryDetail() {
  const { categoryName } = useParams<{ categoryName: string }>();
  const [data, setData] = useState<MonitoringData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDepartmentCostLoading, setIsDepartmentCostLoading] = useState(true);
  const [isAvgKWHLoading, setIsAvgKWHLoading] = useState(true);
  const [isKwhPartsLoading, setIsKwhPartsLoading] = useState(true);
  const [isCombinedDataLoading, setIsCombinedDataLoading] = useState(true);
  const [isMsebTimeZoneLoading, setIsMsebTimeZoneLoading] = useState(true);
  const [isConsumptionLoading, setIsConsumptionLoading] = useState(true);
  const [msebCostData, setMsebCostData] = useState({
    labels: ['Peak Hours', 'Normal Hours', 'Off-Peak Hours'],
    datasets: [
      {
        label: 'Zone A',
        data: [0, 0, 0],
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
      {
        label: 'Zone B',
        data: [0, 0, 0],
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
      },
      {
        label: 'Zone C',
        data: [0, 0, 0],
        backgroundColor: 'rgba(255, 206, 86, 0.5)',
      },
      {
        label: 'Zone D',
        data: [0, 0, 0],
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      }
    ]
  });
  const [departmentCostData, setDepartmentCostData] = useState({
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [
        '#FF6B6B',
        '#FFD93D',
        '#95D03A',
        '#2ECC71',
        '#0A2647'
      ],
      borderWidth: 0,
      cutout: '70%'
    }]
  });
  const [avgKWHData, setAvgKWHData] = useState({
    labels: [],
    datasets: []
  });
  const [selectedOption, setSelectedOption] = useState<string>('combined');
  const [avgKWHChartOptions, setAvgKWHChartOptions] = useState({
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        min: 0,
      },
    },
  });
  const [kwhPartsData, setKwhPartsData] = useState<any[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [kwhTrendData, setKwhTrendData] = useState({
    labels: [],
    datasets: [{
      label: 'KWH/Tonne',
      data: [],
      borderColor: '#2196F3',
      backgroundColor: 'rgba(33, 150, 243, 0.1)',
      hoverBackgroundColor: 'rgba(33, 150, 243, 0.2)',
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 8,
      pointBackgroundColor: '#2196F3',
      pointHoverBackgroundColor: '#1976D2',
      pointBorderColor: '#fff',
      pointHoverBorderColor: '#fff',
      pointBorderWidth: 2,
      pointHoverBorderWidth: 3,
      borderWidth: 2,
      hoverBorderWidth: 3,
      fill: true,
    }]
  });
  const [kwhChartOptions, setKwhChartOptions] = useState({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'KWH/Part',
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Date',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        ticks: {
          maxRotation: 0,
          minRotation: 0,
          callback: function(value) {
            const label = this.getLabelForValue(value);
            if (label) {
              const parsedDate = parseISO(label);
              if (!isNaN(parsedDate.getTime())) {
                const currentDate = format(parsedDate, 'dd');
                const currentMonth = format(parsedDate, 'MMM');
                return `${currentDate}\n${currentMonth}`;
              }
            }
            return '';
          }
        }
      }
    },
  });
  const [combinedData, setCombinedData] = useState<any>({ labels: [], datasets: [] });
  const [yAxisMin, setYAxisMin] = useState<number | undefined>(undefined);
  const [msebTimeZoneData, setMsebTimeZoneData] = useState({
    labels: [],
    datasets: []
  });
  const [consumptionData, setConsumptionData] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<string>('2024-07-30');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('Melting');
  const [selectedMetric, setSelectedMetric] = useState<'consumption' | 'P_F'>('consumption');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGeneratedGraph, setShowGeneratedGraph] = useState(false);
  const [generatedData, setGeneratedData] = useState<GeneratedResponse | null>(null);
  const chartRef = useRef(null); // Create a ref for the chart

  useEffect(() => {
    const fetchData = async () => {
      try {
        const allData = await loadData();
        const categoryData = allData.filter(
          item => item.category === decodeURIComponent(categoryName ?? '')
        );
        setData(categoryData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [categoryName]);

  useEffect(() => {
    const fetchDepartmentCosts = async () => {
      try {
        setIsDepartmentCostLoading(true);
        const response = await fetch(`${API_BASE_URL}/aggregate-energy-costs`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        const costs = result.aggregatedCosts;

        // Update departmentCostData based on fetched data
        setDepartmentCostData({
          labels: costs.map(cost => cost._id),
          datasets: [{
            data: costs.map(cost => cost.totalCost),
            backgroundColor: [
              '#FF6B6B',
              '#FFD93D',
              '#95D03A',
              '#2ECC71',
              '#a6d0ed'
            ],
            borderWidth: 0,
            cutout: '70%'
          }]
        });
      } catch (error) {
        console.error('Error fetching department costs:', error);
      } finally {
        setIsDepartmentCostLoading(false);
        setIsLoading(false);
      }
    };

    fetchDepartmentCosts();
  }, []);

  useEffect(() => {
    const fetchAvgKWHData = async () => {
      try {
        setIsAvgKWHLoading(true);
        const response = await fetch(`${API_BASE_URL}/avgKWH`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        const avgKWH = result.aggregatedData;

        // Prepare data for both machines
        const labels = avgKWH.map(data => data.Date);
        const datasets = [];

        // Logic for combined average or individual machine data
        if (selectedOption === 'combined') {
          // Show combined average if selected
          datasets.push({
            label: 'Combined Average KWH',
            data: avgKWH.map((data) => (data.avg_of_IF1 + data.avg_of_IF2) / 2),
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: function(context) {
              const value = context.raw as number;
              return value > 675 ? '#FF0000' : '#2196F3';
            },
            pointBorderColor: function(context) {
              const value = context.raw as number;
              return value > 675 ? '#FF0000' : '#2196F3';
            }
          });
        } else if (selectedOption === 'IF1') {
          datasets.push({
            label: 'Average KWH - IF1',
            data: avgKWH.map(data => data.avg_of_IF1),
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: function(context) {
              const value = context.raw as number;
              return value > 675 ? '#FF0000' : '#2196F3';
            },
            pointBorderColor: function(context) {
              const value = context.raw as number;
              return value > 675 ? '#FF0000' : '#2196F3';
            }
          });
        } else if (selectedOption === 'IF2') {
          datasets.push({
            label: 'Average KWH - IF2',
            data: avgKWH.map(data => data.avg_of_IF2),
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: function(context) {
              const value = context.raw as number;
              return value > 675 ? '#FF0000' : '#2196F3';
            },
            pointBorderColor: function(context) {
              const value = context.raw as number;
              return value > 675 ? '#FF0000' : '#2196F3';
            }
          });
        }

        setAvgKWHData({
          labels,
          datasets,
        });

        // Calculate the minimum value from the datasets
        const allDataPoints = datasets.flatMap(dataset => dataset.data);
        const minYValue = Math.min(...allDataPoints);

        // Update the chart options with the calculated minimum value
        setAvgKWHChartOptions({
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              min: (minYValue < 0 ? 0 : minYValue) - 10,
              title: {
                display: true,
                text: 'KWH/Tonne',
                font: {
                  size: 12,
                  weight: 'bold'
                }
              }
            },
            x: {
              max: Math.max(...allDataPoints) + 10,
              title: {
                display: true,
                text: 'Date',
                font: {
                  size: 14,
                  weight: 'bold'
                }
              },
              ticks: {
                maxRotation: 45,
                minRotation: 45,
                callback: function(value) {
                  const label = labels[value];
                  if (label) {
                    return format(parseISO(label), 'dd MMM yy');
                  }
                  return '';
                }
              }
            }
          },
          plugins: {
            annotation: {
              annotations: {
                thresholdLine: {
                  type: 'line',
                  yMin: 675,
                  yMax: 675,
                  borderColor: '#FF0000',
                  borderWidth: 2,
                  borderDash: [5, 5],
                  label: {
                    content: 'Threshold (675)',
                    enabled: true,
                    position: 'end',
                    backgroundColor: 'rgba(255, 0, 0, 0.8)',
                    color: 'white',
                    padding: 4
                  }
                }
              }
            }
          }
        });
      } catch (error) {
        console.error('Error fetching average KWH data:', error);
      } finally {
        setIsAvgKWHLoading(false);
        setIsLoading(false);
      }
    };

    fetchAvgKWHData();
  }, [selectedOption]);

  useEffect(() => {
    const fetchKWHPartsData = async () => {
      try {
        setIsKwhPartsLoading(true);
        const response = await fetch(`${API_BASE_URL}/KWHParts`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        setKwhPartsData(result.aggregatedData);

        // Calculate the minimum value for each machine ID
        const machineMinValues: number[] = [];
        result.aggregatedData.forEach(data => {
          Object.values(data.machineData).forEach(value => {
            if (value !== null && value !== undefined) {
              machineMinValues.push(value);
            }
          });
        });

        // Set the minimum value for the Y-axis to the minimum of all machine IDs
        const minYValue = Math.min(...machineMinValues);
        const yAxisMin = minYValue < 0 ? 0 : minYValue; // Ensure minimum is not negative

        // Update the KWH trend data
        setKwhTrendData({
          labels: result.aggregatedData.map(data => data._id), // Dates for X-axis
          datasets: [{
            label: 'KWH/Tonne',
            data: result.aggregatedData.map(data => {
              if (selectedMachine) {
                return data.machineData[selectedMachine] || 0;
              } else {
                // Calculate average across all machines
                const values = Object.values(data.machineData);
                const validValues = values.filter(value => value !== null && value !== undefined);
                return validValues.length > 0 ? 
                  validValues.reduce((acc, curr) => acc + curr, 0) / validValues.length : 
                  0;
              }
            }),
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            hoverBackgroundColor: 'rgba(33, 150, 243, 0.2)',
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 8,
            pointBackgroundColor: '#2196F3',
            pointHoverBackgroundColor: '#1976D2',
            pointBorderColor: '#fff',
            pointHoverBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverBorderWidth: 3,
            borderWidth: 2,
            hoverBorderWidth: 3,
            fill: true,
          }]
        });

        // Update the chart options for KWH parts
        setKwhChartOptions(prevOptions => ({
          ...prevOptions,
          scales: {
            ...prevOptions.scales,
            y: {
              ...prevOptions.scales.y,
              min: yAxisMin, // Set the Y-axis minimum value
            }
          }
        }));

      } catch (error) {
        console.error('Error fetching KWH parts data:', error);
      } finally {
        setIsKwhPartsLoading(false);
        setIsLoading(false);
      }
    };

    fetchKWHPartsData();
  }, [selectedMachine]); // Re-fetch data when selectedMachine changes

  useEffect(() => {
    const fetchCombinedData = async () => {
      try {
        setIsCombinedDataLoading(true);
        const response = await fetch(`${API_BASE_URL}/ConsumptionMoltenMetal`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        const aggregatedData = result.aggregatedData;

        // Prepare data for the combined chart
        const labels = aggregatedData.map(data => data.date);
        const moltenMetalData = aggregatedData.map(data => data.sum_of_moltenmetal);
        const consumptionData = aggregatedData.map(data => data.sum_of_consumtion);

        // Calculate the minimum value for Y-axis
        const minYValue = Math.min(...consumptionData, ...moltenMetalData);
        setYAxisMin(minYValue < 0 ? 0 : minYValue); // Ensure minimum is not negative

        setCombinedData({
          labels,
          datasets: [
            {
              type: 'line',
              label: 'Molten Metal',
              data: moltenMetalData,
              borderColor: '#FFD700',
              fill: false,
              borderWidth: 3,
              pointRadius: 4
            },
            {
              type: 'bar',
              label: 'Consumption',
              data: consumptionData,
              backgroundColor: (context) => {
                const index = context.dataIndex;
                const consumption = consumptionData[index];
                const moltenMetal = moltenMetalData[index];
                // Check if consumption per ton is greater than 1020
                return (consumption/(moltenMetal/1000)) > 1020 ? '#FF5252' : '#2196F3';
              },
              borderWidth: 2,
              order: 0, 
            },
          ]
        });
      } catch (error) {
        console.error('Error fetching combined data:', error);
      } finally {
        setIsCombinedDataLoading(false);
        setIsLoading(false);
      }
    };

    fetchCombinedData();
  }, []);

  useEffect(() => {
    const fetchTimeZoneData = async () => {
      try {
        setIsMsebTimeZoneLoading(true);
        const response = await fetch(`${API_BASE_URL}/TimeZone`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        
        if (!result.aggregatedData || !Array.isArray(result.aggregatedData)) {
          console.error('Invalid data format received:', result);
          return;
        }

        const dates = result.aggregatedData.map(item => item.date);
        
        const datasets = [
          {
            label: 'Zone A',
            data: result.aggregatedData.map(item => item.zoneA),
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            stack: 'Stack 0',
          },
          {
            label: 'Zone B',
            data: result.aggregatedData.map(item => item.zoneB),
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            stack: 'Stack 0',
          },
          {
            label: 'Zone C',
            data: result.aggregatedData.map(item => item.zoneC),
            backgroundColor: 'rgba(255, 206, 86, 0.5)',
            stack: 'Stack 0',
          },
          {
            label: 'Zone D',
            data: result.aggregatedData.map(item => item.zoneD),
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            stack: 'Stack 0',
          }
        ];

        setMsebTimeZoneData({
          labels: dates,
          datasets: datasets
        });
      } catch (error) {
        console.error('Error fetching time zone data:', error);
      } finally {
        setIsMsebTimeZoneLoading(false);
        setIsLoading(false);
      }
    };

    fetchTimeZoneData();
  }, []);

  useEffect(() => {
    const fetchConsumptionData = async () => {
      try {
        setIsConsumptionLoading(true);
        const response = await fetch(`${API_BASE_URL}/consumption`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        setConsumptionData(result.aggregatedData);
      } catch (error) {
        console.error('Error fetching consumption data:', error);
      } finally {
        setIsConsumptionLoading(false);
        setIsLoading(false);
      }
    };

    fetchConsumptionData();
  }, []);

  // Update the chart options to include the Y-axis minimum value
  const baseChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        min: yAxisMin, // Set the Y-axis minimum value
        title: {
          display: true,
          text: 'Consumption (kWh/Tonne)',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: 'rgb(107, 114, 128)',
          padding: 8,
          font: {
            size: 11,
          },
        }
      },
      x: {
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
          drawBorder: false,
        },
        title: {
          display: true,
          text: 'Date',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        ticks: {
          color: 'rgb(107, 114, 128)',
          padding: 8,
          font: {
            size: 11,
          },
          maxRotation: 0,
          minRotation: 0,
          callback: function(value) {
            const label = this.getLabelForValue(value);
            if (label) {
              const parsedDate = parseISO(label);
              if (!isNaN(parsedDate.getTime())) {
                const currentDate = format(parsedDate, 'dd');
                const currentMonth = format(parsedDate, 'MMM');
                return `${currentDate}\n${currentMonth}`;
              }
            }
            return '';
          }
        }
      }
    },
    plugins: {
      tooltip: {
        mode: 'index',
        intersect: false,
      },
      legend: {
        display: true,
        position: 'top',
      }
    },
  };

  // Then calculate the total
  const total = departmentCostData.datasets[0].data.reduce(
    (acc, curr) => acc + curr, 
    0
  );

  // Update the pie chart options
  const options = {
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          label: (context: TooltipItem<'bar'>) => {
            const value = context.raw as number;
            const percentage = ((value / total) * 100).toFixed(1);
            return [
              `Amount: ₹${value.toLocaleString('en-IN')}`,
              `Percentage: ${percentage}%`
            ];
          }
        }
      }
    },
    animation: {
      duration: 2000,
      animateRotate: true,
      animateScale: true
    },
    elements: {
      arc: {
        borderWidth: 0,
        hoverBorderWidth: 3,
        hoverBorderColor: '#ffffff',
        hoverOffset: 15
      }
    },
    hover: {
      mode: 'nearest',
      intersect: true
    }
  };

  const tooltipCallbacks = {
    label: function(context: TooltipItem<'bar'>) {
      let label = context.dataset.label || '';
      if (label) {
        label += ': ';
      }
      if (context.parsed.y !== null) {
        label += context.parsed.y.toFixed(2);
      }
      return label;
    }
  };

  // Toggle machine selection
  const toggleMachine = (machine: string) => {
    setSelectedMachines(prev => {
      if (prev.includes(machine)) {
        return prev.filter(m => m !== machine);
      } else {
        return [...prev, machine];
      }
    });
  };

  // Update the options for the MSEB cost chart
  const msebChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false
        },
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        stacked: true,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Cost (₹)'
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.1)'
        },
        ticks: {
          callback: (value: any) => `₹${value.toLocaleString('en-IN')}`
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ₹${context.raw.toLocaleString('en-IN', {
              maximumFractionDigits: 0
            })}`;
          }
        }
      }
    }
  };

  const prepareChartData = () => {
    if (!consumptionData) return null;

    const dayData = consumptionData.find((day: any) => day.Date === selectedDay);
    if (!dayData) return null;

    const departmentData = dayData.Departments[selectedDepartment];
    if (!departmentData) return null;

    const labels = Array.from({ length: 24 }, (_, i) => i.toString());
    const datasets = Object.entries(departmentData).map(([machineId, hourlyData]: [string, any]) => ({
      label: `${machineId} ${selectedMetric === 'P_F' ? 'Power Factor' : 'Consumption'}`,
      data: labels.map(hour => hourlyData[hour]?.[selectedMetric] || null),
      borderColor: machineId === 'IF1' ? '#2196F3' : 
                  machineId === 'IF2' ? '#FF5722' : 
                  machineId === 'MM1' ? '#4CAF50' : '#FFC107',
      backgroundColor: 'transparent',
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 8,
    }));

    return {
      labels,
      datasets,
    };
  };

  const getChartOptions = () => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        min: selectedMetric === 'P_F' ? 0 : undefined,
        max: selectedMetric === 'P_F' ? 1 : undefined, // Set max to 1 for power factor
        title: {
          display: true,
          text: selectedMetric === 'P_F' ? 'Power Factor' : 'Consumption (kWh)',
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Hours of the Day',
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      }
    },
    plugins: {
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => {
            const value = context.raw;
            if (selectedMetric === 'P_F') {
              return `${context.dataset.label}: ${value?.toFixed(2)}`;
            }
            return `${context.dataset.label}: ${value} kWh`;
          }
        }
      },
      legend: {
        position: 'top',
      }
    }
  });

  // Function to check if a heading matches the search query
  const matchesSearch = (heading: string): boolean => {
    return heading.toLowerCase().includes(searchQuery.toLowerCase());
  };

  // Function to handle the generation of the graph based on the search query
  const handleGenerate = async () => {
    if (!searchQuery) return;
    
    setIsGenerating(true);
    setShowGeneratedGraph(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/chat-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: searchQuery }),
      });
      
      if (!response.ok) {
        // If the server responds with an error, show a "not relevant" card
        const notRelevantData: GeneratedResponse = {
          displayConfig: {
            displayType: 'cards',
            cards: [{
              title: 'Not Relevant Query',
              value: 'N/A',
              unit: '',
              description: 'The search query is not related to available data. Please try a different search term.',
              trend: 'neutral'
            }]
          }
        };
        setGeneratedData(notRelevantData);
        return;
      }

      const data = await response.json();
      console.log('Raw response:', data);
      
      // If the response is empty or invalid, show a "not relevant" card
      if (!data || !data.displayConfig || !data.displayConfig.displayType) {
        const notRelevantData: GeneratedResponse = {
          displayConfig: {
            displayType: 'cards',
            cards: [{
              title: 'Not Relevant Query',
              value: 'N/A',
              unit: '',
              description: 'The search query is not related to available energy monitoring data. Please try a different search term.',
              trend: 'neutral'
            }]
          }
        };
        setGeneratedData(notRelevantData);
        return;
      }

      // If we have valid data, format and use it
      const formattedData: GeneratedResponse = {
        displayConfig: {
          displayType: data.displayConfig.displayType,
          ...(data.displayConfig.cards && { cards: data.displayConfig.cards }),
          ...(data.displayConfig.chartConfig && { chartConfig: data.displayConfig.chartConfig })
        }
      };

      console.log('Formatted data:', formattedData);
      setGeneratedData(formattedData);
    } catch (error) {
      console.error('Error generating response:', error);
      // In case of any error, show a "not relevant" card
      const notRelevantData: GeneratedResponse = {
        displayConfig: {
          displayType: 'cards',
          cards: [{
            title: 'Error Processing Query',
            value: 'Error',
            unit: '',
            description: 'An error occurred while processing your search query. Please try again.',
            trend: 'neutral'
          }]
        }
      };
      setGeneratedData(notRelevantData);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    // Cleanup function to destroy the chart instance
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    console.log('Generated Data State:', generatedData);
  }, [generatedData]);

  // Add this component for displaying cards
  const MetricCard = ({ title, value, unit, description, trend }: Card) => {
    console.log('Rendering MetricCard:', { title, value, unit, description, trend }); // Debug log
    
    const getTrendIcon = () => {
      switch (trend) {
        case 'up':
          return <ArrowUpIcon className="h-4 w-4 text-green-500" />;
        case 'down':
          return <ArrowDownIcon className="h-4 w-4 text-red-500" />;
        default:
          return <MinusIcon className="h-4 w-4 text-gray-500" />;
      }
    };

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
        <div className="mt-2 flex items-baseline">
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {value}
            {unit && <span className="ml-1 text-sm font-medium text-gray-500">{unit}</span>}
          </p>
          <div className="ml-2">{getTrendIcon()}</div>
        </div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
                {decodeURIComponent(categoryName ?? '')}
              </h1>
            </div>
            
            {/* Search Bar */}
            <div className="relative w-full mt-4 sm:mt-0 sm:w-auto">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search headings..."
                    className="w-full pl-10 pr-4 py-3 border border-blue-500 rounded-lg bg-blue-50 dark:bg-gray-800 
                            text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-md"
                    style={{ minWidth: '300px' }} // Ensure a minimum width for better visibility
                  />
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={!searchQuery || isGenerating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                           disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
                >
                  {isGenerating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Cost of Energy by Department */}
          {matchesSearch('Cost of Energy by Department') && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 w-full">
              <h2 className="text-base font-medium mb-4 text-gray-900 dark:text-white">
                Cost of Energy by Department
              </h2>
              <div className="relative h-[300px] sm:h-[400px] lg:h-64">
                {isDepartmentCostLoading ? (
                  <LoadingSpinner />
                ) : (
                  <Pie data={departmentCostData} options={options} />
                )}
                <div 
                  className="absolute top-1/2 right-2 transform -translate-y-1/2"
                  style={{ pointerEvents: 'none' }}
                >
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                      Total
                    </div>
                    <div className="text-base text-gray-600 dark:text-gray-400">
                      ₹ {total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search Graph */}
          {matchesSearch('Average KWH/Tonne Trend') && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-medium text-gray-900 dark:text-white">
                  Average KWH/Tonne Trend
                </h2>
                <div className="relative">
                  <select
                    value={selectedOption}
                    onChange={(e) => setSelectedOption(e.target.value)}
                    className="px-3 py-1 rounded bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white sticky top-0"
                  >
                    <option value="combined">Combined Average</option>
                    <option value="IF1">IF1 Average</option>
                    <option value="IF2">IF2 Average</option>
                  </select>
                </div>
              </div>
              <div className="h-[300px] sm:h-[400px] lg:h-64 overflow-x-auto scrollbar-hidden">
                {isAvgKWHLoading ? (
                  <LoadingSpinner />
                ) : (
                  <div style={{ minWidth: '464px', height: '232px' }}>
                    <Line data={avgKWHData} options={avgKWHChartOptions} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Average KWH/Part */}
          {matchesSearch('Average KWH/Part') && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-medium text-gray-900 dark:text-white">
                  Average KWH/Part
                </h2>
                <select 
                  value={selectedMachine}
                  onChange={(e) => setSelectedMachine(e.target.value)}
                  className="px-3 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                >
                  <option value="">All Machines</option>
                  {Object.keys(kwhPartsData[0]?.machineData || {}).map(machineId => (
                    <option key={machineId} value={machineId}>{machineId}</option>
                  ))}
                </select>
              </div>
              <div className="h-[300px] sm:h-[400px] lg:h-64 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {isKwhPartsLoading ? (
                  <LoadingSpinner />
                ) : (
                  <div style={{ minWidth: '464px', height: '100%' }}>
                    <Line data={kwhTrendData} options={kwhChartOptions} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Consumption and Molten Metal Trend */}
          {matchesSearch('Consumption and Molten Metal Trend') && (
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-medium text-gray-900 dark:text-white">
                  Consumption and Molten Metal Trend
                </h2>
              </div>
              <div className="h-[300px] sm:h-[400px] lg:h-64">
                {isCombinedDataLoading ? (
                  <LoadingSpinner />
                ) : (
                  <Line data={combinedData} options={baseChartOptions} />
                )}
              </div>
            </div>
          )}

          {/* Cost */}
          {matchesSearch('Cost Distribution by Time Zone') && (
            <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-medium text-gray-900 dark:text-white">
                  Cost (₹) wrt MSEB Time Zone
                </h2>
              </div>
              <div className="h-[300px] sm:h-[400px] lg:h-64">
                {isMsebTimeZoneLoading ? (
                  <LoadingSpinner />
                ) : (
                  <Bar 
                    data={msebTimeZoneData} 
                    options={{
                      ...msebChartOptions,
                      scales: {
                        ...msebChartOptions.scales,
                        y: {
                          ...msebChartOptions.scales.y,
                          ticks: {
                            callback: function(value) {
                              return `${(value / 1000).toFixed(0)}K`; // Format Y-axis values in K
                            },
                          },
                        },
                        x: {
                          ...msebChartOptions.scales.x,
                          ticks: {
                            callback: function(value) {
                              const label = this.getLabelForValue(value);
                              if (label) {
                                const date = format(parseISO(label), 'dd MMM yy'); // Format date
                                const dateParts = date.split(' '); // Split into parts
                                return `${dateParts[0]}\n${dateParts[1]}\n${dateParts[2]}`; // Return formatted string for vertical display
                              }
                              return '';
                            },
                            padding: 5, // Reduced padding for better spacing
                            font: {
                              size: 10, // Smaller font size for better clarity
                              family: 'Arial', // Set font family
                              weight: 'normal', // Normal weight for less emphasis
                            },
                          },
                          title: {
                            display: true,
                            text: 'Date',
                            padding: {
                              top: 10,
                              bottom: 10
                            },
                            font: {
                              size: 12, // Slightly smaller title font size
                              weight: 'bold', // Keep title bold for emphasis
                            }
                          }
                        }
                      }
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Daily Consumption Trend */}
          {matchesSearch('Daily Consumption Trend') && (
            <div className="col-span-full bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <h2 className="text-base font-medium text-gray-900 dark:text-white">
                  Daily Consumption Trend
                </h2>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
                  <input
                    type="date"
                    value={selectedDay}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      if (consumptionData?.some(day => day.Date === newDate)) {
                        setSelectedDay(newDate);
                      }
                    }}
                    min={consumptionData?.[0]?.Date}
                    max={consumptionData?.[consumptionData.length - 1]?.Date}
                    className="px-3 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-800 
                             dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 
                             focus:border-transparent w-full sm:w-auto"
                  />
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="px-3 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-800 
                             dark:border-gray-600 dark:text-white w-full sm:w-auto"
                  >
                    {consumptionData && Object.keys(consumptionData[0].Departments).map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  <select
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value as 'consumption' | 'P_F')}
                    className="px-3 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-800 
                             dark:border-gray-600 dark:text-white w-full sm:w-auto"
                  >
                    <option value="consumption">Power Consumption</option>
                    <option value="P_F">Power Factor</option>
                  </select>
                </div>
              </div>
              <div className="h-[300px] sm:h-[400px] overflow-x-auto">
                {isConsumptionLoading ? (
                  <LoadingSpinner />
                ) : (
                  consumptionData && (
                    <Line 
                      data={prepareChartData() || { labels: [], datasets: [] }}
                      options={{
                        ...getChartOptions(),
                        maintainAspectRatio: false,
                        scales: {
                          ...getChartOptions().scales,
                          x: {
                            ...getChartOptions().scales.x,
                            ticks: {
                              maxRotation: 45,
                              minRotation: 45,
                              font: {
                                size: 10,
                              },
                              callback: function(value) {
                                return `${value}:00`;  // Display hours in 24-hour format
                              }
                            }
                          }
                        }
                      }}
                    />
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conditional rendering for generated graph */}
      {showGeneratedGraph && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-medium text-gray-900 dark:text-white">
              Generated Content
            </h2>
            <button
              onClick={() => {
                setShowGeneratedGraph(false);
                setSearchQuery('');
                setGeneratedData(null);
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Back to All Graphs
            </button>
          </div>
          {isGenerating ? (
            <LoadingSpinner />
          ) : generatedData && generatedData.displayConfig ? (
            <>
              {generatedData.displayConfig.displayType === 'cards' && generatedData.displayConfig.cards ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {generatedData.displayConfig.cards.map((card: Card, index: number) => (
                    <MetricCard 
                      key={index}
                      title={card.title}
                      value={card.value}
                      unit={card.unit}
                      description={card.description}
                      trend={card.trend}
                    />
                  ))}
                </div>
              ) : generatedData.displayConfig.displayType === 'chart' && generatedData.displayConfig.chartConfig ? (
                <div className="h-[500px] overflow-x-auto">
                  <Line
                    ref={chartRef}
                    data={{
                      labels: generatedData.displayConfig.chartConfig.labels || [],
                      datasets: generatedData.displayConfig.chartConfig.datasets || []
                    }}
                    options={{
                      ...baseChartOptions,
                      ...generatedData.displayConfig.chartConfig.options,
                      plugins: {
                        ...baseChartOptions.plugins,
                        title: {
                          display: true,
                          text: generatedData.displayConfig.chartConfig.title || '',
                          font: {
                            size: 16,
                            weight: 'bold'
                          }
                        }
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  Invalid display type: {generatedData.displayConfig.displayType}
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400">
              No data available. Try generating a response first.
            </div>
          )}
        </div>
      )}
    </div>
  );
}