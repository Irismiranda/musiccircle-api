import React, { useState, useEffect, useRef } from "react"
import { Outlet } from "react-router-dom"
import { PlayerMaximized, PlayerMinimized, PlayerOnScroll, Post, ShareMenu } from ".."
import { connect_device, SvgMinMaxBtn, SvgResizeHandle } from "../../assets"
import useStore from "../../store"

export default function PlayerManager() {
    const [isShareMenuVisibile, setIsShareMenuVisibile] = useState(false)
    const [isPostVisible, setIsPostVisible] = useState(false)
    const [playerState, setPlayerState] = useState({ 
        player: undefined,
        isPaused: false,
        isActive: false,
        currentTrack: null,
        listened: (0.1),
        isLiked: false,
        shuffleState: false,
        repeatState: false,
        volumePercentage: 1,
        isMute: false,
        isMinimized: false,
        isScrolled: false,
    })

    const prevArtistUriRef = useRef(null)
    const prevSetVolume = useRef(null)
    const postWindowRef = useRef(null)
    const shareMenuRef = useRef(null)
    const playerRef = useRef(null)
    const draggableHandleRef = useRef(null)

    const clientPrevPosY = useRef(null)
    const clientPrevPosX = useRef(null)
    const playerRectRef = useRef(null)

    const [isResizing, setIsResizing] = useState(false)
    const [playerSize, setPlayerSize] = useState({
        height: 248,
        width: 620,
    })

    const [isMoving, setIsMoving] = useState(false)
    const [playerPosStyle, setPlayerPosStyle] = useState({ 
        top: 0, 
        left: 0,
    })
    
    const { spotifyApi, accessToken, setArtistUri, artistUri, standardWrapperWidth } = useStore()

    function setProperties(callback, property, value) {
        callback((prevState) => ({
          ...prevState,
          [property]: value,
        }))
    }

    async function handleShuffleClick() {
        spotifyApi.setShuffle(!playerState.shuffleState)
        setProperties(setPlayerState, 'shuffleState', !playerState.shuffleState)        
    }

    async function handleRepeatClick() {
        if (playerState.repeatState === 0 || playerState.repeatState === 1) {
            const newState = playerState.repeatState + 1
            setProperties(setPlayerState, 'repeatState', newState)
        } else {
            setProperties(setPlayerState, 'repeatState', 0)
        }
    }

    function calculatePosition(e, rect) {
        const handleRelativePosition = e.clientX - rect.left
        const fraction = handleRelativePosition / rect.width
        return fraction
    }

    async function trackVolumePosition(e, volumeBarRef) {
        const volumeBarRect = volumeBarRef.current.getBoundingClientRect()
        const volumePercentage = calculatePosition(e, volumeBarRect) * 100
        const roundedPercentage = Math.round(volumePercentage)
        setProperties(setPlayerState, 'volumePercentage', roundedPercentage)
        try {
            await spotifyApi.setVolume(roundedPercentage)
        } catch (error) {
            console.log(error)
        }
    }

    async function handleHeartClick(id) {
        const trackIds = [id]
        if (!playerState.isLiked) {
            try{
                await spotifyApi.addToMySavedTracks(trackIds)
                setProperties(setPlayerState, 'isLiked', true)
            } catch(err){
                console.log(err)
            }
        } else {
            try{
                await spotifyApi.removeFromMySavedTracks(trackIds)
                setProperties(setPlayerState, 'isLiked', false)
            } catch(err){
                console.log(err)
            }
        }
    }

    function handleTimelineClick(e, trackTimelineRef) {
        const rect = trackTimelineRef.current.getBoundingClientRect()
        const fraction = calculatePosition(e, rect);
        setProperties(setPlayerState, 'listened', fraction * 100)
        const positionInSec = fraction * playerState.currentTrack
        playerState.player.seek(positionInSec).then(() => {
        }) 
    }

    const handleScroll = () => {  

        const prevPlayerHeight = playerRef.current.offsetHeight
        
        if(window.scrollY > 1 + prevPlayerHeight){
            setProperties(setPlayerState, 'isScrolled', true)
        } else{
            setProperties(setPlayerState, 'isScrolled', false)
        }
    }

    const getInitialPos = (e) => {   
        if(playerState.isMinimized){

            clientPrevPosX.current = e.clientX
            clientPrevPosY.current = e.clientY 
            playerRectRef.current = playerRef.current.getBoundingClientRect()
            
            if(draggableHandleRef.current.contains(e.target)) {
                setProperties(setPlayerSize, 'width', playerRef.current.offsetWidth)
                setProperties(setPlayerSize, 'height', playerRef.current.offsetHeight)
                setIsResizing(true)
                setIsMoving(false)
            } else{  
                setIsMoving(true)
                setIsResizing(false)
            }
        }
    }

    const handlePlayerMove = (e) => {
        if (!isMoving) return

        const dx = e.clientX - clientPrevPosX.current
        const dy = e.clientY - clientPrevPosY.current

        const newLeft = Math.max(0, Math.min((playerRectRef.current.left + dx), document.documentElement.clientWidth - playerRef.current.offsetWidth - 0))
        const newTop = Math.max(0, Math.min((playerRectRef.current.top + dy), document.documentElement.clientHeight - playerRef.current.offsetHeight - 5))

        setPlayerPosStyle({ left: newLeft, top: newTop })
    }

    const handleResize = (e) => {
        if (!isResizing) return
        const { width, height } = playerSize
        const dx = e.clientX - clientPrevPosX.current + width
        const dy = e.clientY - clientPrevPosY.current + height

        const newWidth = Math.min(dx, document.documentElement.clientWidth - playerRectRef.current.x)
        const newHeight = Math.min(dy, document.documentElement.clientHeight - playerRectRef.current.y)

        if(dx > 615){
            setProperties(setPlayerSize, 'width', newWidth)
            setProperties(setPlayerSize, 'height', (newWidth / 2.5))
        } else{
            const maxHeight = Math.min(dy, 175)
            setProperties(setPlayerSize, 'width', newWidth)
            setProperties(setPlayerSize, 'height', maxHeight)
        }
    }

    useEffect(() => {
        async function updateMuteState(){
            const { isMute, volumePercentage } = playerState
            if(isMute && volumePercentage){
                prevSetVolume.current = volumePercentage
                setProperties(setPlayerState, 'volumePercentage', 0)
                await spotifyApi.setVolume(0)
            } else if(!playerState.isMute && prevSetVolume.current){
                setProperties(setPlayerState,'volumePercentage', prevSetVolume.current)
                await spotifyApi.setVolume(prevSetVolume.current)
            }
        }
        updateMuteState()
    }, [playerState.isMute])

    useEffect(() => {
        window.addEventListener("scroll", handleScroll)
    
        return () => {
            window.removeEventListener("scroll", handleScroll)
        }
    }, [])

    useEffect(() => {
        async function getIsTrackSaved() {
            const trackIds = [playerState.currentTrack.id]
            const response = await spotifyApi.containsMySavedTracks(trackIds)
            setProperties(setPlayerState, 'isLiked', response[0])
        }

        if (playerState.currentTrack) {
            getIsTrackSaved()
        }
    }, [playerState.currentTrack])

    useEffect(() => {
        const script = document.createElement("script")
        script.src = "https://sdk.scdn.co/spotify-player.js"
        script.async = true

        document.body.appendChild(script);

        window.onSpotifyWebPlaybackSDKReady = () => {

            const player = new window.Spotify.Player({
                name: 'MusicCircle',
                getOAuthToken: cb => { cb(accessToken); },
                volume: 0.5
            })

            setProperties(setPlayerState, 'player', player)
        
            player.connect()

            const interval = setInterval(() => {
                player.getCurrentState().then((state) => {
                    if (state && state.position && state.duration && !state.paused) {
                        const totalListened = (100 * state.position) / state.duration
                        setProperties(setPlayerState, 'listened', totalListened)
                    }
                })
            }, 50)

            player.addListener('player_state_changed', (state => {

                if (!state) {
                    return
                }

                setProperties(setPlayerState, 'currentTrack', state.track_window.current_track)

                try{
                    const currentArtistUri = state.track_window.current_track.artists[0].uri
                    if (!artistUri || currentArtistUri !== prevArtistUriRef.current) {
                    setArtistUri(currentArtistUri)
                    prevArtistUriRef.current = currentArtistUri
                    }
                }catch(err){
                    console.log(err)
                }

                setProperties(setPlayerState, 'shuffleState', state.shuffle)
                setProperties(setPlayerState, 'repeatState', state.repeat_mode)
                setProperties(setPlayerState, 'isPaused', state.paused)

                player.getVolume().then(volume => {
                    let percentage = volume * 100
                    setProperties(setPlayerState, 'volumePercentage', percentage)
                })

                player.getCurrentState().then(state => {
                    (!state) ? setProperties(setPlayerState, 'isActive', false) : setProperties(setPlayerState, 'isActive', true)
                })

            }))

            player.addListener('player_state_changed', ({
                state,
                position,
                duration,
            }) => {
                const totalListened = (100 * position) / duration
                setProperties(setPlayerState, 'listened', totalListened)
            })

            return () => clearInterval(interval)
        }

    }, [accessToken])

    useEffect(() => {

        const handleMouseUp = () => {
            setIsResizing(false)
        }
        
        if (isResizing) {
            window.addEventListener('mousemove', handleResize)
            window.addEventListener('mouseup',  handleMouseUp)
        } else {
            window.removeEventListener('mousemove', handleResize)
            window.removeEventListener('mouseup', handleMouseUp)
        }

        return () => {
            window.removeEventListener('mousemove', handleResize)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isResizing])

    useEffect(() => {       
        const handleMouseUp = () => {
            setIsMoving(false)
        }

        if (isMoving) {
            window.addEventListener('mousemove', handlePlayerMove)
            window.addEventListener('mouseup',  handleMouseUp)
        } else {
            window.removeEventListener('mousemove', handlePlayerMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }

        return () => {
            window.removeEventListener('mousemove', handlePlayerMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
    }, [isMoving])

    useEffect(() => {
        console.log("log - is scrolled?", playerState.isScrolled)
    }, [playerState.isScrolled])

    const playerFunctionalProps = {
        setProperties,
        handleShuffleClick,
        handleRepeatClick,
        trackVolumePosition,
        handleHeartClick,
        handleTimelineClick,
        isPostVisible, 
        setIsPostVisible,
        isShareMenuVisibile, 
        setIsShareMenuVisibile,
        handleResize,
        getInitialPos,
        playerSize,
      }

    if (!playerState.currentTrack) {
        return (
            <>
            <div className="wrapper default_padding flex flex_column" style={{ width: standardWrapperWidth }}>
                <img src={connect_device} style={{ width: "200px" }}/>
                <h3>Connect your device</h3>
            </div>
            <Outlet />
            </>
        )
    } else {
        const { isScrolled, isMinimized } = playerState
        return (
            <> 
            { isPostVisible && 
                <div 
                className="post_wrapper wrapper default_padding" 
                ref={postWindowRef}>
                    <Post />
                </div> }
                <div 
                className={isMinimized ? "player_minimized wrapper fixed" : "player_default wrapper sticky"}
                onMouseDown={(e) => getInitialPos(e)}
                style={{ 
                    width: isMinimized ? `${playerSize.width}px` : standardWrapperWidth,
                    height: isMinimized ? `${playerSize.height}px` : "",
                    left: isMinimized ?  playerPosStyle.left : "",
                    top: isMinimized ? playerPosStyle.top : ""}}>

                    { isShareMenuVisibile &&
                        <div 
                        className="share_menu_wrapper wrapper default_padding sticky full_width" 
                        style={{ 
                            left: isMinimized ? "18%" : "", 
                            top: isMinimized ? "90%" : ""
                        }}
                        ref={shareMenuRef}>
                            <ShareMenu />
                    </div>}

                    <div onClick={() => setProperties(setPlayerState, 'isMinimized', !isMinimized)}>
                        <SvgMinMaxBtn className="minMaxBtn" is_minimized={isMinimized.toString()}/>
                    </div>

                    { (!isScrolled && !isMinimized) &&
                    <div 
                    className="full_width"
                    ref={playerRef}>
                        <PlayerMaximized
                        shareMenuRef={shareMenuRef}
                        postWindowRef={postWindowRef}
                        playerState={playerState}
                        setPlayerState={setPlayerState}
                        playerFunctionalProps={playerFunctionalProps}
                    />
                    </div>
                    }

                    { (isScrolled && !isMinimized) 
                    && 
                    <div 
                    className="full_width"
                    ref={playerRef}>
                        <PlayerOnScroll 
                        shareMenuRef={shareMenuRef}
                        postWindowRef={postWindowRef}
                        playerState={playerState}
                        setPlayerState={setPlayerState}
                        playerFunctionalProps={playerFunctionalProps}
                    />
                    </div>
                    }

                    { isMinimized && 
                    <div 
                    className={playerSize.width > 615 ? "grid" : "min_layout"}
                    style={{ flexDirection: playerSize.height < 120 ? "row" : "column" }}
                    ref={playerRef}>
                        <PlayerMinimized 
                        shareMenuRef={shareMenuRef}
                        postWindowRef={postWindowRef}
                        playerState={playerState}
                        setPlayerState={setPlayerState}
                        playerFunctionalProps={playerFunctionalProps}
                    />
                       <div 
                        className="draggable_handle" 
                        ref={draggableHandleRef}
                        onMouseDown={(e) => getInitialPos(e)}>
                            <SvgResizeHandle />
                        </div>
                    </div>}
                </div>
                <Outlet />
            </>
        )

    }

}
