import React, { useState, useRef, useEffect } from "react";
import { chat_illustration } from "../../assets"
import useStore from "../../store"

export default function Messages(props) {
  const storedMessages = useRef(null)
  const prevChatId = useRef(null)
  const [messages, setMessages] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const { socket, currentUser } = useStore()
  const { chatId, chatProfileId, type } = props

  useEffect(() => {
    if(prevChatId.current){
      socket?.emit('leaveChat', {chatId: prevChatId.current})
    }
    console.log("log - props are", props)
  }, [])
  
  useEffect(() => {
    const handleLoadAllMessages = (messages) => {
      setIsLoading(true)
      console.log("log - loading all messages", messages[0])
      setMessages(messages[0])
      storedMessages.current = messages[0]
      setIsLoading(false)
    }

    const handleLoadNewMessage = (messages) => {
      setIsLoading(true)
      console.log("log - loading new messages", messages[0][0])
      const newMessages = messages[0][0]
      console.log(
        "log - there are previowsly loaded messages",
        storedMessages.current
      )
      console.log("log - new message is:", newMessages)
      console.log("log - new message id is:", newMessages.messageId)
      console.log("log - stored messages are", storedMessages.current)

      const messageIndex = storedMessages.current.findIndex(
        (message) => message.messageId === newMessages.messageId
      )
      console.log("log - index is:", messageIndex)
      if (messageIndex === -1) {
        const updatedMessages = [...storedMessages.current, newMessages]
        setMessages(updatedMessages)
        storedMessages.current = updatedMessages
        setIsLoading(false)
      } else {
        const updatedMessages = [...storedMessages.current]
        updatedMessages[messageIndex] = newMessages
        setMessages(updatedMessages)
        storedMessages.current = updatedMessages
        console.log("log - messages updated", updatedMessages)
        setIsLoading(false)
      }

    }
  
    socket.onAny((eventName, ...args) => {
      if(eventName === "loadAllMessages"){
        console.log("log - loadAllMessages event received")
        handleLoadAllMessages(args)
      } else if(eventName === "loadNewMessage"){
        console.log("log - loadNewMessage event received")
        handleLoadNewMessage(args)
      }
    })
  
    return () => {
      socket.offAny()
    }
  }, [socket])

  useEffect(() => {
    if(chatProfileId){
      socket?.emit('connectToChat', { id: chatProfileId, type: type })
      prevChatId.current = chatProfileId
    }
  }, [chatProfileId, socket])

  function replyToMessage(userName) {
    messageInput.value = messageInput.value.replace(/^/, `@${userName}`);
  }

  function removeMessage(id) {
    socket?.emit("removeMessage", { id: chatProfileId, chatId, messageId: id });
  }
  return (
    
    <div>
      {isLoading ? (
        <>
          <h3>Loading...</h3>
          <br/><br/>
        </>
      ) : messages.length > 0 ? (
      <div className="chat_room flex">
        {messages
          .sort((a, b) => (a.timeStamp > b.timeStamp ? -1 : 1))
          .map((message) => {
            const {
              userId,
              userName,
              userProfilePic,
              text,
              messageId,
              timeStamp,
              display,
            } = message
            return (
              <div
                key={messageId}
                className="message_wrapper"
                style={{
                  alignSelf: userId === currentUser.userId ? "start" : "end",
                  textAlign: userId === currentUser.userId ? "left" : "right",
                  marginBottom: "2px",
                }}
              >
                <div className="flex">
                  {type === "user" && <img src={`${userProfilePic}`} />}
                  <h4>
                    <a href={`/profile/${userId}`}>{userName}</a>
                  </h4>
                </div>
                <div className="chat-message">
                  {display ? <p>{text}</p> : <p>message deleted</p>}
                </div>
                <div
                  className="flex"
                  style={{
                    justifyContent:
                      userId === currentUser.userId ? "start" : "end",
                    textAlign: userId === currentUser.userId ? "left" : "right",
                    margin: "0 30px",
                  }}
                >
                  {display && currentUser.userId === userId && (
                    <h4
                      style={{ cursor: "pointer" }}
                      onClick={() => replyToMessage(userName)}
                    >
                      Reply
                    </h4>
                  )}
                  {display && currentUser.userId !== userId && (
                    <h4
                      style={{ cursor: "pointer" }}
                      onClick={() => removeMessage(messageId)}
                    >
                      Remove
                    </h4>
                  )}
                  <h6>{timeStamp}</h6>
                </div>
              </div>
            )
          })}
      </div>
    ) : (
      type === "artists" && 
      <div className="no_messages">
        <img src={chat_illustration} />
        <h3>Everyone is comming to chat, be the first one to break the ice</h3>
      </div>
    )}
  </div>
  )
}
