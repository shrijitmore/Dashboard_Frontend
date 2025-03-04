import { useState, useEffect } from 'react';
import annotationPlugin from 'chartjs-plugin-annotation';
import { useParams, Link } from 'react-router-dom';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { ChevronLeft, Search } from 'lucide-react';
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

export function CategoryDetail() {
  const { categoryName } = useParams<{ categoryName: string }>();
  const [data, setData] = useState<MonitoringData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
        min: 0, // Default minimum value
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
              const currentDate = format(parseISO(label), 'dd');
              const currentMonth = format(parseISO(label), 'MMM');
              return `${currentDate}\n${currentMonth}`;
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
  const [selectedMetric, setSelectedMetric] = useState<'consumption' | 'F_F'>('consumption');
  const [searchQuery, setSearchQuery] = useState('');

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
        const response = await fetch('http://localhost:5000/api/aggregate-energy-costs');
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
              '#0A2647'
            ],
            borderWidth: 0,
            cutout: '70%'
          }]
        });
      } catch (error) {
        console.error('Error fetching department costs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDepartmentCosts();
  }, []);

  useEffect(() => {
    const fetchAvgKWHData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/avgKWH');
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
        setIsLoading(false);
      }
    };

    fetchAvgKWHData();
  }, [selectedOption]);

  useEffect(() => {
    const fetchKWHPartsData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/KWHParts');
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
      }
    };

    fetchKWHPartsData();
  }, [selectedMachine]); // Re-fetch data when selectedMachine changes

  useEffect(() => {
    const fetchCombinedData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/ConsumptionMoltenMetal');
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
      }
    };

    fetchCombinedData();
  }, []);

  useEffect(() => {
    const fetchTimeZoneData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/TimeZone');
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
      }
    };

    fetchTimeZoneData();
  }, []);

  useEffect(() => {
    const fetchConsumptionData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/consumption');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        setConsumptionData(result.aggregatedData);
      } catch (error) {
        console.error('Error fetching consumption data:', error);
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
              const currentDate = format(parseISO(label), 'dd');
              const currentMonth = format(parseISO(label), 'MMM');
              return `${currentDate}\n${currentMonth}`;
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

  // Then define the options
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
        callbacks: {
          label: (context: TooltipItem<'bar'>) => {
            const value = context.raw;
            return `₹ ${value.toLocaleString('en-IN', { 
              maximumFractionDigits: 0 
            })}`;
          }
        }
      }
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
      label: `${machineId} ${selectedMetric === 'F_F' ? 'Power Factor' : 'Consumption'}`,
      data: labels.map(hour => hourlyData[hour][selectedMetric]),
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

  // Add this helper function to check if a heading matches the search query
  const matchesSearch = (heading: string): boolean => {
    return heading.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
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
            <div className="relative max-w-md w-full ml-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search headings..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-800 
                           text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                           border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 
                           focus:ring-blue-500 focus:border-transparent"
                />
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
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <span>Loading...</span>
                  </div>
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

          {/* Average KWH/Tonne Trend */}
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
              <div className="h-[300px] sm:h-[400px] lg:h-64 overflow-auto scrollbar-hidden">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <span>Loading...</span>
                  </div>
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
              <div className="h-[300px] sm:h-[400px] lg:h-64">
                <Line data={kwhTrendData} options={kwhChartOptions} />
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
                <Line data={combinedData} options={baseChartOptions} />
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
              </div>
            </div>
          )}

          {/* Daily Consumption Trend */}
          {matchesSearch('Daily Consumption Trend') && (
            <div className="col-span-full bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-medium text-gray-900 dark:text-white">
                  Daily Consumption Trend
                </h2>
                <div className="flex gap-4">
                  <input
                    type="date"
                    value={selectedDay}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      // Only update if the date exists in the consumption data
                      if (consumptionData?.some(day => day.Date === newDate)) {
                        setSelectedDay(newDate);
                      }
                    }}
                    min={consumptionData?.[0]?.Date}
                    max={consumptionData?.[consumptionData.length - 1]?.Date}
                    className="px-3 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-800 
                             dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 
                             focus:border-transparent"
                  />
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="px-3 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  >
                    {consumptionData && Object.keys(consumptionData[0].Departments).map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  <select
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value as 'consumption' | 'F_F')}
                    className="px-3 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  >
                    <option value="consumption">Power Consumption</option>
                    <option value="F_F">Power Factor</option>
                  </select>
                </div>
              </div>
              <div className="h-[400px]">
                {consumptionData && <Line 
                  data={prepareChartData() || { labels: [], datasets: [] }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: selectedMetric === 'consumption' ? 'Consumption (kWh)' : 'Power Factor'
                        }
                      },
                      x: {
                        title: {
                          display: true,
                          text: 'Hours of the Day'
                        }
                      }
                    },
                    plugins: {
                      tooltip: {
                        mode: 'index',
                        intersect: false,
                      },
                      legend: {
                        position: 'top',
                      }
                    }
                  }}
                />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
