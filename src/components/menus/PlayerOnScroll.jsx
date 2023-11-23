import React, { useRef } from "react"
import { SvgCommentBtn, SvgShareBtn, SvgPlayBtn, SvgHeart, SvgRandom, SvgRepeat, SvgVolume, SvgPrevBtn, SvgNextBtn } from "../../assets"
import { useClickOutside } from "../../utils/utils"


const PlayerOnScroll = ((props) => {
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
        isMute,  
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
        setIsShareMenuVisibile 
    } = props.playerFunctionalProps

    const { shareMenuRef, postWindowRef, setPlayerState } = props

    const albumImg = currentTrack.album.images[0].url
    const trackName = currentTrack.name
    const artistName = currentTrack.artists[0].name
    const songId = currentTrack.id

    useClickOutside(shareMenuRef, shareBtnRef, () => setIsShareMenuVisibile(false))
    useClickOutside(postWindowRef, commentBtnRef, () => setIsPostVisible(false))

    return (
            <div className="flex_column gap">
                <div className="flex">
                    <h3 style={{ lineHeight: "50px"}}>  {trackName} by {artistName} </h3>
                    <div className="flex" onClick={() => handleHeartClick(songId)}>
                        <SvgHeart className="svg_small" style={{ fill: isLiked ? '#F230AA' : 'none', stroke: isLiked ? "#F230AA" : "#AFADAD" }} />
                    </div>
                </div>
                <div className="flex">
                    <div onClick={() => { player.previousTrack() }}>
                        <SvgPrevBtn className="svg" />
                    </div>

                    <div onClick={() => { player.togglePlay() }} >
                        <SvgPlayBtn is_paused={isPaused ? "true" : "false"} className="svg_medium"/>
                    </div>

                    <div>
                        <SvgNextBtn className="svg" onClick={() => { player.nextTrack() }} />
                    </div>

                    <div className="track-timeline bar" 
                        ref={trackTimelineRef} 
                        onClick={(e) => handleTimelineClick(e, trackTimelineRef)}>
                        <div className="track-listened" style={{ width: `${listened}%` }}></div>
                    </div>
                </div>
                <div className="flex space-between">
                    <div className="flex">
                        <div className="flex" onClick={() => handleShuffleClick()}>
                            <SvgRandom className="svg" style={{ fill: shuffleState ? '#F230AA' : '#AFADAD' }} />
                        </div>
                        <div className="flex" onClick={() => handleRepeatClick()}>
                            <SvgRepeat className="svg" repeat_state={repeatState} style={{ fill: repeatState === 1 || repeatState === 2 ? '#F230AA' : '#AFADAD' }} />
                        </div>
                        <div className="flex">
                            <div className="flex" onClick={() => {setProperties(setPlayerState, 'isMute', !isMute)}}> 
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
                    </div>
                    <div className="flex">
                        <div className="flex" ref={commentBtnRef}>
                            <SvgCommentBtn className="svg" fill={"#AFADAD"} onClick={() => setIsPostVisible(!isPostVisible)}/>
                        </div>
                        <div className="flex" ref={shareBtnRef}>
                            <SvgShareBtn className="svg" onClick={() => setIsShareMenuVisibile(!isShareMenuVisibile)}/>
                        </div>
                    </div>
                </div>
            </div> 
    )
})

export default PlayerOnScroll