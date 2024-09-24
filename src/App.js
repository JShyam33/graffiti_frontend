import React, { useRef, useState, useEffect } from 'react';
import './App.css';
export const colorDict = {
  "red": 1,
  "green": 2,
  "blue": 3,
  "black": 4
}

export const reverseColorDict = {
  1: "red",
  2: "green",
  3: "blue",
  4: "black"
  
}
const App = () => {
  const canvasRef = useRef(null);
  const toolBoxRef = useRef(null);
  const [isPainting, setIsPainting] = useState(false);
  const [selectedColor, setSelectedColor] = useState('black');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [sprayRadius, setSprayRadius] = useState(20);
  const [Density, setDensity] = useState(20);
  const [sprayCommands, setSprayCommands] = useState([]); // Track spray actions
  const [renderingIndex, setRenderingIndex] = useState(0); // Index for the current rendering batch


  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Ensure canvas resolution matches the display size
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    const scale = window.devicePixelRatio || 1;
    canvas.width = displayWidth * scale;
    canvas.height = displayHeight * scale;
    ctx.scale(scale, scale);
  }, []);

  const startPainting = (event) => {
    if (!showColorPicker) return;

    const toolbox = toolBoxRef.current;
    const rect = toolbox.getBoundingClientRect();

    if (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    )
      return;

    setIsPainting(true);
    paint(event);
  };

  const stopPainting = () => {
    setIsPainting(false);
  };

  const paint = (event) => {
    if (!isPainting || !showColorPicker) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let radius = sprayRadius;
    let density = Density;
    let color = selectedColor;

    let colorCode = colorDict[color];
    const newCommand = { x, y, radius, density, colorCode };
    let newCommandStr = Object.values(newCommand).join('_');
    setSprayCommands((prevCommands) => [...prevCommands, newCommandStr]);

    if (sprayCommands.length + 1 >= 50) {
      sendSprayData([...sprayCommands, newCommandStr]);
      setSprayCommands([]);
    }

    sprayPaint(ctx, x, y, sprayRadius, Density, selectedColor);
  };

  // Spray paint effect: Generates small dots in a circular area and tracks the command
  const sprayPaint = (ctx, x, y, radius, density, color) => {
    
    const dense = density * 2;
    //console.log('Spray painting:', x, y, radius, dense, color);
    ctx.fillStyle = color;

    for (let i = 0; i < dense; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * 1.5 * radius;
      const offsetX = Math.cos(angle) * distance;
      const offsetY = Math.sin(angle) * distance;
      ctx.beginPath();
      ctx.arc(x + offsetX, y + offsetY, Math.random() * 0.02 + 1, 0, 2 * Math.PI);
      ctx.fill();
    }

    
  };

  const sendSprayData = async (commands) => {
    try {
      //console.log('Sending spray data:', commands);
      await fetch(`${process.env.REACT_APP_WORKER_URL}/save_spray_data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sprayCommands: commands }),
      });
      console.log('Spray data sent successfully');
    } catch (error) {
      console.error('Error sending spray data:', error);
    }
  };

  const saveImage = async (event) => {
    if (sprayCommands.length > 0) {
      
      await sendSprayData(sprayCommands);
      setSprayCommands([]);
    }

    setShowColorPicker(false);
    event.stopPropagation();
  };

  // Fetch saved spray commands in batches
  const fetchSavedSprayCommands = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/fetch-spray-commands`);
      const data = await response.json();
      console.log('data:', data);  
      
      await renderSprayCommandsInBatches(data);// Start rendering from the first batch
    } catch (error) {
      console.error('Error fetching spray commands:', error);
    }
  };

  useEffect(() => {
    setSprayCommands([]);
    fetchSavedSprayCommands();
  }, []);

  // Asynchronously render spray commands with fade-in effect in batches of 100
  const renderSprayCommandsInBatches = async (commands) => {
    //console.log('Rendering spray commands:', commands);
    await delay(200); // Delay before rendering
    console.log('Rendering spray commands:', commands);
    
    for(let j = 0; j < commands.length; j++) {
      
      const batch = commands[j];
      const ctx = canvasRef.current.getContext('2d');
      
      for (let i = 0; i < batch.length; i++) {
        
        const sprayCommand = batch[i];
        //console.log('spray command:', sprayCommand);
        const [ x, y, radius, density, colorCode ] = sprayCommand.split("_");
        let xNum = parseInt(x);
        let yNum = parseInt(y);
        let radiusNum = parseInt(radius);
        let densityNum = parseInt(density);
        let colorNum = parseInt(colorCode);

        console.log('Rendering spray command:', xNum, yNum, radiusNum, densityNum, colorCode);
        
        let color = reverseColorDict[colorNum];
        
        sprayPaint(ctx, xNum, yNum, radiusNum, densityNum, color);
        
      }
      
      await delay(200); // Delay before rendering
      
    }
  };

  
  

  

  const handleToolbarClick = (event) => {
    event.stopPropagation();
  };

  return (
    <div className="app">
      <div ref={toolBoxRef} className="toolbar" onClick={handleToolbarClick}>
        {!showColorPicker && (
          <button className="btn" onClick={() => setShowColorPicker(!showColorPicker)}>
            Paint
          </button>
        )}
        {showColorPicker && (
          <div className="color-picker">
            <button className="color-btn" onClick={() => setSelectedColor('black')}>
              Black
            </button>
            <button className="color-btn" onClick={() => setSelectedColor('red')}>
              Red
            </button>
            <button className="color-btn" onClick={() => setSelectedColor('green')}>
              Green
            </button>
            <button className="color-btn" onClick={() => setSelectedColor('blue')}>
              Blue
            </button>

            <input
              type="range"
              min="5"
              max="100"
              value={sprayRadius}
              onChange={(e) => setSprayRadius(e.target.value)}
            />
            <label>Spray Radius: {sprayRadius}</label>

            <input
              type="range"
              min="10"
              max="100"
              value={Density}
              onChange={(e) => setDensity(e.target.value)}
            />
            <label>Density: {Density}</label>

            <button className="btn done-btn" onClick={saveImage}>
              Done
            </button>
          </div>
        )}
      </div>
      <canvas
        ref={canvasRef}
        className="canvas"
        onMouseDown={startPainting}
        onMouseUp={stopPainting}
        onMouseMove={paint}
      ></canvas>
    </div>
  );
};

export default App;
