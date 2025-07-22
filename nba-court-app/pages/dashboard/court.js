'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Fast NBA simulation hook
function useNBASimulation() {
  const [isLoading, setIsLoading] = useState(false);
  
  const findBestPlay = useCallback(async (players) => {
    setIsLoading(true);
    
    try {
      const startTime = performance.now();
      
      const positions = players.map((player, idx) => ({
        player_id: idx + 1,
        team_id: idx < 5 ? 0 : 1,
        x: player.x,
        y: player.y
      }));
      
      const response = await fetch('http://localhost:5001/api/nba/fast-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions })
      });
      
      if (!response.ok) {
        throw new Error('Simulation failed');
      }
      
      const result = await response.json();
      const endTime = performance.now();
      
      console.log(`Fast simulation: ${endTime - startTime}ms`);
      
      return result;
    } catch (error) {
      console.error('Simulation error:', error);
      return { error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const getMovementData = useCallback(async (gameId, eventId) => {
    try {
      const response = await fetch('http://localhost:5001/api/nba/get-movement-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, eventId })
      });
      
      if (!response.ok) {
        throw new Error('Movement data failed');
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Movement data error:', error);
      throw error;
    }
  }, []);
  
  return { findBestPlay, getMovementData, isLoading };
}

export default function NBACourtDashboard() {
  // NBA court proportions: 94ft x 50ft, with baskets on left/right after rotation
  const [players, setPlayers] = useState([
    // Red team (offense) - positioned on left side (attacking right basket)
    { id: 1, x: 200, y: 300, team: 'red' }, // Point guard - center court
    { id: 2, x: 180, y: 200, team: 'red' }, // Shooting guard - wing
    { id: 3, x: 180, y: 400, team: 'red' }, // Small forward - wing
    { id: 4, x: 120, y: 250, team: 'red' }, // Power forward - low post
    { id: 5, x: 120, y: 350, team: 'red' }, // Center - paint
    
    // Blue team (defense) - positioned to defend
    { id: 6, x: 240, y: 300, team: 'blue' }, // Defender 1 - on ball
    { id: 7, x: 220, y: 220, team: 'blue' }, // Defender 2
    { id: 8, x: 220, y: 380, team: 'blue' }, // Defender 3
    { id: 9, x: 160, y: 270, team: 'blue' }, // Defender 4
    { id: 10, x: 160, y: 330, team: 'blue' }, // Defender 5
  ]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [showPlayResult, setShowPlayResult] = useState(false);
  const [playResult, setPlayResult] = useState(null);
  const [animationStatus, setAnimationStatus] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [animationData, setAnimationData] = useState(null);
  const [ballPosition, setBallPosition] = useState({ x: 200, y: 300, z: 10 }); // Start with point guard - rotated court
  
  const { findBestPlay, getMovementData, isLoading } = useNBASimulation();

  // Performance optimized drag handler
  const handleDrag = useCallback((id, x, y) => {
    if (!isAnimating) {  // Don't allow dragging during animation
      setPlayers(prev => prev.map(player => 
        player.id === id ? { ...player, x, y } : player
      ));
    }
  }, [isAnimating]);

  // Animation system
  useEffect(() => {
    if (isAnimating && animationData && animationFrame < animationData.frames.length) {
      const timer = setTimeout(() => {
        const currentFrame = animationData.frames[animationFrame];
        
        // Update player positions
        setPlayers(prev => prev.map(player => {
          const framePlayer = currentFrame.players.find(p => p.id === player.id);
          return framePlayer ? {
            ...player,
            x: framePlayer.x,
            y: framePlayer.y
          } : player;
        }));
        
        // Update ball position
        setBallPosition({
          x: currentFrame.ball.x,
          y: currentFrame.ball.y, 
          z: currentFrame.ball.z
        });
        
        setAnimationFrame(prev => prev + 1);
      }, 50); // 20fps = 50ms per frame
      
      return () => clearTimeout(timer);
    } else if (isAnimating && animationFrame >= animationData?.frames?.length) {
      // Animation complete
      setIsAnimating(false);
      setAnimationStatus('Animation complete!');
      setTimeout(() => setAnimationStatus(''), 2000);
    }
  }, [isAnimating, animationData, animationFrame]);

  // Start animation with real NBA data
  const startAnimation = useCallback(async (gameId, eventId) => {
    try {
      setAnimationStatus(`Loading real NBA data: Game ${gameId}, Event ${eventId}...`);
      
      const movementResult = await getMovementData(gameId, eventId);
      
      if (movementResult.error) {
        setAnimationStatus(`Real NBA data not available: ${movementResult.error}`);
        setTimeout(() => setAnimationStatus(''), 5000);
        return;
      }
      
      console.log('Got movement data:', movementResult);
      
      setAnimationData(movementResult);
      setAnimationFrame(0);
      setIsAnimating(true);
      setAnimationStatus(`Playing REAL NBA DATA: ${movementResult.frames.length} frames from ${movementResult.note || 'NBA game'}`);
      
    } catch (error) {
      console.error('Animation error:', error);
      setAnimationStatus(`Animation failed: ${error.message}`);
      setTimeout(() => setAnimationStatus(''), 5000);
    }
  }, [getMovementData]);

  // Instant play finding with optimized UI feedback
  const handleFindBestPlay = useCallback(async () => {
    try {
      setAnimationStatus('Finding best play...');
      
      const result = await findBestPlay(players);
      
      if (result.error) {
        setAnimationStatus(`Error: ${result.error}`);
        return;
      }

      const { best_play } = result;
      setPlayResult(result);
      setShowPlayResult(true);
      setAnimationStatus(`Found: Game ${best_play.game_id}, Event ${best_play.event_id}`);

      // Auto-start animation for instant feedback
      setTimeout(async () => {
        await startAnimation(best_play.game_id, best_play.event_id);
      }, 500);

    } catch (error) {
      setAnimationStatus('Search failed');
      setTimeout(() => setAnimationStatus(''), 3000);
    }
  }, [players, findBestPlay, startAnimation]);

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: 'linear-gradient(45deg, #2d5016 0%, #4a7c59 50%, #2d5016 100%)',
      fontFamily: 'system-ui, sans-serif'
    }}>
      
      {/* Court Background - Rotated for left/right baskets */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: '300px',
        bottom: 0,
        backgroundImage: 'url(/court.svg)',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundColor: '#2d5016',
        transform: 'rotate(90deg)',
        transformOrigin: 'center center'
      }}>
        
        {/* Performance Status Bar */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 30,
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontFamily: 'monospace',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span>
            {animationStatus || (isAnimating ? `Frame ${animationFrame}/${animationData?.frames?.length || 0}` : `${players.length} players positioned`)}
          </span>
          {(isLoading || isAnimating) && <span>⏳</span>}
          {isAnimating && (
            <button
              onClick={() => setIsAnimating(false)}
              style={{
                background: '#ff4444',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Stop
            </button>
          )}
        </div>

        {/* Fast Action Button */}
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 30
        }}>
          <motion.button
            onClick={handleFindBestPlay}
            disabled={isLoading || isAnimating}
            style={{
              background: (isLoading || isAnimating) ? '#666' : '#ff6b35',
              color: 'white',
              fontWeight: 'bold',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              cursor: (isLoading || isAnimating) ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              fontSize: '16px'
            }}
            whileHover={{ scale: (isLoading || isAnimating) ? 1 : 1.05 }}
            whileTap={{ scale: (isLoading || isAnimating) ? 1 : 0.95 }}
          >
            {isLoading ? '🔍 Finding...' : isAnimating ? '🎬 Playing...' : '🏀 FIND BEST PLAY'}
          </motion.button>
        </div>

        {/* Basketball */}
        <motion.div
          animate={{
            x: ballPosition.x,
            y: ballPosition.y,
            scale: Math.max(0.8, Math.min(1.2, ballPosition.z / 20)) // Size based on height
          }}
          transition={{ duration: 0.05 }}
          style={{
            position: 'absolute',
            zIndex: 15,
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, #ff8c00, #ff6600)',
            border: '2px solid #cc4400',
            boxShadow: `0 ${ballPosition.z / 10}px ${ballPosition.z / 5}px rgba(0,0,0,0.3)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px'
          }}
        >
          🏀
        </motion.div>

        {/* Draggable Players */}
        {players.map((player, idx) => (
          <motion.div
            key={player.id}
            drag={!isAnimating} // Disable dragging during animation
            dragMomentum={false}
            dragElastic={0.1}
            animate={{ x: player.x, y: player.y }} // This makes players move during animation!
            transition={{ duration: 0.05, ease: "linear" }} // Smooth movement
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
            onDrag={(event, info) => {
              if (!isAnimating) {
                handleDrag(player.id, info.point.x, info.point.y);
              }
            }}
            style={{
              position: 'absolute',
              zIndex: 10,
              width: '60px',
              height: '60px',
              cursor: isAnimating ? 'not-allowed' : 'grab',
              touchAction: 'none'
            }}
            whileHover={{ scale: isAnimating ? 1 : 1.1 }}
            whileTap={{ scale: isAnimating ? 1 : 0.9 }}
          >
            <div style={{
              textAlign: 'center',
              color: 'white',
              fontSize: '12px',
              fontWeight: '600',
              marginBottom: '4px',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
            }}>
              P{player.id}
            </div>
            <motion.div
              style={{
                width: '100%',
                height: '50px',
                borderRadius: '50%',
                border: `4px solid ${player.team === 'red' ? '#ef4444' : '#3b82f6'}`,
                background: player.team === 'red' ? '#dc2626' : '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '16px',
                boxShadow: `0 0 20px ${player.team === 'red' ? '#ef4444' : '#3b82f6'}`
              }}
            >
              {player.id}
            </motion.div>
          </motion.div>
        ))}

        {/* Play Result Popup */}
        <AnimatePresence>
          {showPlayResult && playResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              style={{
                position: 'absolute',
                bottom: '80px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 40
              }}
            >
              <div style={{
                background: 'rgba(255,255,255,0.95)',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,107,53,0.3)',
                maxWidth: '400px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: '16px'
                }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', margin: 0 }}>
                    Best Play Found! 🏀
                  </h3>
                  <button
                    onClick={() => setShowPlayResult(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#666',
                      fontSize: '20px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    ×
                  </button>
                </div>
                <div style={{ fontSize: '14px', lineHeight: '1.5', color: '#333' }}>
                  <p><strong>Game:</strong> {playResult.best_play.game_id}</p>
                  <p><strong>Event:</strong> {playResult.best_play.event_id}</p>
                  <p><strong>Similarity:</strong> {(playResult.best_play.similarity_score * 100).toFixed(1)}%</p>
                  <p><strong>Shot Quality:</strong> {(playResult.best_play.shot_quality * 100).toFixed(1)}%</p>
                  <p style={{ color: '#16a34a', fontWeight: '500' }}>
                    {isAnimating ? `Playing animation... (${animationFrame}/${animationData?.frames?.length || 0})` : 'Animation will play on court...'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sidebar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: menuOpen ? 0 : '-240px',
        height: '100%',
        width: '240px',
        background: 'white',
        boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
        zIndex: 30,
        transition: 'left 0.3s ease',
        padding: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff6b35' }}>
            🏀 AthlynkAI
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '16px 0',
          borderBottom: '1px solid #eee',
          marginBottom: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#ff6b35',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold'
          }}>
            A
          </div>
          <div>
            <p style={{ fontWeight: 'bold', fontSize: '18px', color: '#333', margin: 0 }}>
              Allen
            </p>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
              Coach
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#ff6b35', 
            cursor: 'pointer',
            margin: 0,
            padding: '8px',
            borderRadius: '4px',
            background: '#fff5f2'
          }}>
            NBA Simulation
          </p>
          <p style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#333',
            cursor: 'pointer',
            margin: 0,
            padding: '8px'
          }}>
            My Team
          </p>
          <p style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#333',
            cursor: 'pointer',
            margin: 0,
            padding: '8px'
          }}>
            Plays
          </p>
          <p style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#333',
            cursor: 'pointer',
            margin: 0,
            padding: '8px'
          }}>
            Analysis
          </p>
        </div>
      </div>

      {/* Hamburger button when menu is closed */}
      {!menuOpen && (
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <button
            onClick={() => setMenuOpen(true)}
            style={{
              background: 'rgba(255,255,255,0.9)',
              border: 'none',
              padding: '8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ☰
          </button>
          <div style={{ 
            color: 'white', 
            fontWeight: 'bold', 
            fontSize: '20px',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
          }}>
            🏀 AthlynkAI
          </div>
        </div>
      )}

      {/* Player Info Panel */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        height: '100%',
        width: '300px',
        background: '#f5f5f5',
        borderLeft: '1px solid #ddd',
        zIndex: 20,
        padding: '16px',
        overflowY: 'auto'
      }}>
        <h3 style={{ marginBottom: '16px', color: '#333' }}>Player Info</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {players.map((player) => (
            <div key={player.id} style={{
              padding: '12px',
              background: 'white',
              borderRadius: '8px',
              border: `2px solid ${player.team === 'red' ? '#ef4444' : '#3b82f6'}`,
              fontSize: '14px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                Player {player.id} ({player.team === 'red' ? 'Red' : 'Blue'})
              </div>
              <div>Position: ({player.x.toFixed(0)}, {player.y.toFixed(0)})</div>
            </div>
          ))}
        </div>
        
        {playResult && (
          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: '#fff5f2',
            borderRadius: '8px',
            border: '1px solid #ff6b35'
          }}>
            <h4 style={{ color: '#ff6b35', marginBottom: '8px' }}>Last Result</h4>
            <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
              <p>Game: {playResult.best_play.game_id}</p>
              <p>Similarity: {(playResult.best_play.similarity_score * 100).toFixed(1)}%</p>
              <p>Matches: {playResult.similar_plays_count}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}