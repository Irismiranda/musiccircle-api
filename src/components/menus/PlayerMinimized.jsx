        import React, { useRef } from "react"
        import { SvgCommentBtn, SvgShareBtn, SvgPlayBtn, SvgHeart, SvgRandom, SvgRepeat, SvgVolume, SvgPrevBtn, SvgNextBtn } from "../../assets"
        import { useClickOutside } from "../../utils/utils"

        const PlayerMinimized = ((props) => {
            const shareBtnRef = useRef(null)
            const commentBtnRef = useRef(null)
            const volumeBarRef = useRef(null)
            const trackTimelineRef = useRef(null)

            const { 
                player, 
                isPaused,
                currentTrack, 
                listened, 
                isLiked, 
                shuffleState, 
                repeatState, 
                volumePercentage, 
                isMute
            } = props.playerState
            
            const { 
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
                getInitialPos,
                playerSize,
            } = props.playerFunctionalProps

            const { shareMenuRef, postWindowRef, setPlayerState } = props

            const albumImg = currentTrack.album.images[0].url
            const trackName = currentTrack.name
            const artistName = currentTrack.artists[0].name
            const songId = currentTrack.id

            useClickOutside(shareMenuRef, shareBtnRef, () => setIsShareMenuVisibile(false))
            useClickOutside(postWindowRef, commentBtnRef, () => setIsPostVisible(false))

            if(playerSize.width > 615){
                
                return (
                <>
                        <div className="cover_flexible overlay" style={{ background: `linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8379726890756303) 100%), url(${albumImg})` }}>
                        <div className="flex social_btns">
                        <div ref={commentBtnRef}>
                            <SvgCommentBtn className="svg" fill={"#AFADAD"} onClick={() => setIsPostVisible(!isPostVisible)}/>
                        </div>
                        <div ref={shareBtnRef}>
                            <SvgShareBtn className="svg" onClick={() => setIsShareMenuVisibile(!isShareMenuVisibile)}/>
                        </div>
                        <div onClick={() => handleHeartClick(songId)}>
                            <SvgHeart className="svg" style={{ fill: isLiked ? '#F230AA' : 'none', stroke: isLiked ? "#F230AA" : "#AFADAD" }} />
                        </div>
                    </div>
                        </div>
                
                        <h2> {trackName} </h2>
                        <h3> {artistName} </h3>
                        
                    <div className="flex main_btns">
                        <div onClick={() => { player.previousTrack() }}>
                            <SvgPrevBtn className="svg" />
                        </div>
    
                        <div onClick={() => { player.togglePlay() }} >
                            <SvgPlayBtn is_paused={isPaused ? "true" : "false"} className="svg_medium"/>
                        </div>
    
                        <div>
                            <SvgNextBtn className="svg" onClick={() => { player.nextTrack() }} />
                        </div>
    
                    </div>
                    
                    <div 
                    className="track-timeline bar" 
                    ref={trackTimelineRef} 
                    onClick={(e) => handleTimelineClick(e, trackTimelineRef)}>
                        <div className="track-listened" style={{ width: `${listened}%` }}></div>
                    </div>
                    
                    <div className="flex secondary_btns">
                        <div className="flex">
                            <div onClick={() => handleShuffleClick()}>
                                <SvgRandom className="svg" style={{ fill: shuffleState ? '#F230AA' : '#AFADAD' }} />
                            </div>
                            <div onClick={() => handleRepeatClick()}>
                                <SvgRepeat className="svg" repeat_state={repeatState} style={{ fill: repeatState === 1 || repeatState === 2 ? '#F230AA' : '#AFADAD' }} />
                            </div>
                        </div>
                        <div onClick={() => {setProperties(setPlayerState, 'isMute', !isMute)}}> 
                            <SvgVolume className="svg" volume_percentage={volumePercentage}/>
                        </div>
                        <div
                        ref={volumeBarRef}
                        className="volume-bar bar flex"
                        onClick={(e) => trackVolumePosition(e, volumeBarRef)}>
                            <div className="volume-level"
                                style={{ width: `${volumePercentage}%` }}>
                            </div>
                        </div>
                    </div>
                </> 
            )
        } else return (           
            <>
                <div className="flex secondary_btns">
                    <h4> {trackName} by {artistName} </h4>
                    {(playerSize.height > 120 || playerSize.width > 580) && <div className="flex">
                        <div onClick={() => handleShuffleClick()}>
                            <SvgRandom className="svg" style={{ fill: shuffleState ? '#F230AA' : '#AFADAD' }} />
                        </div>
                        <div onClick={() => handleRepeatClick()}>
                            <SvgRepeat className="svg" repeat_state={repeatState} style={{ fill: repeatState === 1 || repeatState === 2 ? '#F230AA' : '#AFADAD' }} />
                        </div>
                    </div>}
                </div>
                    
                <div className="flex main_btns">
                    <div onClick={() => { player.previousTrack() }}>
                        <SvgPrevBtn className="svg" />
                    </div>

                    <div onClick={() => { player.togglePlay() }} >
                        <SvgPlayBtn is_paused={isPaused ? "true" : "false"} className="svg_medium"/>
                    </div>

                    <div>
                        <SvgNextBtn className="svg" onClick={() => { player.nextTrack() }} />
                    </div>

                    <div 
                    className="track-timeline bar" 
                    ref={trackTimelineRef} 
                    onClick={(e) => handleTimelineClick(e, trackTimelineRef)}>
                        <div className="track-listened" style={{ width: `${listened}%` }}></div>
                    </div>

                    <div onClick={() => {setProperties(setPlayerState, 'isMute', !isMute)}}> 
                        <SvgVolume className="svg" volume_percentage={volumePercentage}/>
                    </div>
                    <div
                    ref={volumeBarRef}
                    className="volume-bar bar flex"
                    onClick={(e) => trackVolumePosition(e, volumeBarRef)}>
                        <div className="volume-level"
                            style={{ width: `${volumePercentage}%` }}>
                        </div>
                    </div>
                </div>
                    
                    {playerSize.height > 145 && <div className="flex social_btns">  
                        <div ref={commentBtnRef}>
                            <SvgCommentBtn className="svg" fill={"#AFADAD"} onClick={() => setIsPostVisible(!isPostVisible)}/>
                        </div>
                        <div ref={shareBtnRef}>
                            <SvgShareBtn className="svg" onClick={() => setIsShareMenuVisibile(!isShareMenuVisibile)}/>
                        </div>
                        <div onClick={() => handleHeartClick(songId)}>
                            <SvgHeart className="svg" style={{ fill: isLiked ? '#F230AA' : 'none', stroke: isLiked ? "#F230AA" : "#AFADAD" }} />
                        </div>
                    </div>} 
                </> 
            )
        })

        export default PlayerMinimized

