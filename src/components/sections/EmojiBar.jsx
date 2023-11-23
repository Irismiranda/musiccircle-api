import React, { useEffect, useState, createRef } from "react"
import { Axios } from "../../Axios-config"

export default function EmojiBar(props){
    const emoji_searchbar = createRef(null)
    const [emojiList, setEmojiList] = useState(null)
    const [selectedCategory, setSelectedCategory] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const categories = [
        { 
            slug: 'smileys-emotion',
            emoji: '😊'
        },
        {
            slug: 'people-body',
            emoji: '💃'
        },
        {
            slug: 'animals-nature',
            emoji: '🦄'
        },
        {
            slug: 'food-drink',
            emoji: '🍭'
        },
        {
            slug: 'travel-places',
            emoji: '🏖️'
        },
        {
            slug: 'objects',
            emoji: '✂️'
        },
        {
            slug: 'flags',
            emoji: '🏳️‍🌈'
        }
    ]
    
    async function getEmojis(category){
        setSelectedCategory(category)
        setIsLoading(true)
         const response = await Axios.post("/api/emoji_category", {
            category: category
         })
         const emojis = response.data.map(emoji => {
             return <p style={{cursor: "pointer"}} key={emoji.slug} onClick={() => props.insertEmoji(emoji.character)}>{emoji.character}</p>
         })
         setEmojiList(emojis)
         setIsLoading(false)
     }

     async function searchEmojis(){
        setSelectedCategory(null)
        setEmojiList(null)
        setIsLoading(true)
        const search_term = emoji_searchbar.value
        const response = await Axios.post("/api/search_emojis", {
            search_term: search_term,
         })

         if(response.data.length > 0){
             const emojis = response.data.map(emoji => {
                 return <p style={{cursor: "pointer"}} onClick={() => props.insertEmoji(emoji.character)}>{emoji.character}</p>
            })
            setEmojiList(emojis)
         } else {
            setEmojiList(<h5 style={{width: "150px", color: "grey", marginTop: "auto", textAlign: "center"}}>Sorry, no results were found 🫣</h5>)
         }      
        setIsLoading(false)  
     }

    useEffect(() => {
        setSelectedCategory('smileys-emotion')
        getEmojis('smileys-emotion')
    }, [])

    return (
        <div className="wrapper default_padding emoji_bar">
            <input ref={emoji_searchbar} placeholder="Search..." onInput={() => searchEmojis()}/>
            <div className="categories flex" >
                {
                    categories.map( category => {
                        return (
                            <span key={category.slug} className={ selectedCategory === category.slug ? "selected" : "" } style={{cursor: "pointer"}} onClick={() => getEmojis(category.slug)}> {category.emoji} </span>
                        )
                    })
                }
            </div>
            <div className="emoji_list">
                {!emojiList || isLoading ? <h5 style={{width: "150px", color: "grey", marginTop: "auto", textAlign: "center"}}>Loading...</h5> : emojiList}
            </div>
        </div>
    )
}