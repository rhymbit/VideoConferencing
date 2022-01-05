import { deleteDoc, DocumentReference, Firestore } from "firebase/firestore";
import Peer from 'peerjs';
import { useContext, useEffect, useLayoutEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppContext } from "../../App";
import cameraIcon from '../../assets/icons/camera.svg';
import copyIcon from '../../assets/icons/copy.svg';
import localStreamPosterIcon from '../../assets/icons/localStreamPoster.svg';
import phoneHangupIcon from '../../assets/icons/phoneHangup.svg';
import { addDisconnectCallDocument, addMyPeerDocument, removeMyPeerIdDocument } from "./firestoreManipulation";
import { setNewConnectionsSnapshotListener, setRemoveConnectionSnapshotListener, setStopConnectionSnapshotListener } from "./snapshots";


export default function Room() {

  const navigate = useNavigate();

  const {
    db,
    localStream, setLocalStream,
    username
  } = useContext(AppContext);

  const params = useParams();

  const [myPeer, setMyPeer] = useState<Peer>();
  const [myPeerDocId, setMyPeerDocId] = useState<string>(``);
  const [snapshotSet, setSnapshotSet] = useState(false);
  const [stopMyStream, setStopMyStream] = useState(false);
  
  // get local video stream, set it to localStream and display it on the page
  useLayoutEffect(() => {
    
    if (localStream !== null) {
      const myVideo = document.getElementById("localStreamRoom") as HTMLVideoElement;
      myVideo.srcObject = localStream;
      myVideo.muted = true;
    } else {
      getLocalVideo()
        .then(stream => {
          setLocalStream(stream);
        })
    }
  }, [localStream]);

  
  // generate peerId and write it to firestore and listen for new connections
  useEffect(() => {
    if (localStream !== null) {
      if (params.roomId === undefined || params.roomId === "" || params.roomId === null) {
        // navigate back to home because something is wrong
        navigate("/");
      } else {

        if (!snapshotSet) {
          
          // create a new Peer for this user
          const myNewPeer = new Peer();
          setMyPeer(myNewPeer);
          
          // when peer connected then write details to firestore and setup snapshot listeners
          myNewPeer.on('open', peerId => {
  
            addMyPeerDocument(db, params.roomId as string, username, myNewPeer)
              .then(docRefId => {
                
                if (docRefId.length > 0) {

                  // save the doc ref
                  setMyPeerDocId(docRefId);
    
                  // setup snapshot listeners
                  if (params.roomId !== undefined)  {
    
                    // for new peerIds
                    setNewConnectionsSnapshotListener(db, myNewPeer, params.roomId, localStream);
    
                    // for removing connections
                    setRemoveConnectionSnapshotListener(db, myNewPeer, params.roomId);
    
                    // for stopping connections
                    setStopConnectionSnapshotListener(db, myNewPeer, params.roomId);
                  }
  
                } else {
                  console.log("error adding myPeerId document to firestore");
                }
              })
          });
  
          // setup call answering event listener
          myNewPeer.on('call', call => {
            call.answer(localStream);
          })

          // no need to re-run this effect for snapshot listeners
          setSnapshotSet(true);
        }
      }
    }

  }, [localStream]);

  return (
    <div className="waves-background grid grid-cols-1 grid-rows-6 w-full h-full justify-items-center">

       {/* streams */}
      <div
        id="streams"
      >
        <video
          id="localStreamRoom" autoPlay playsInline poster={localStreamPosterIcon}
        />
      </div>

       {/* controls and share link */}
      <div className="flex flex-wrap justify-center items-center">

        {/* controls => cam_button, hangup_button */}
        <div className="flex flex-wrap justify-center m-4">
          {/* camera, hangup */}
          <div className="w-full sm:w-56 md:w-64 flex justify-evenly items-center mb-3">
            <div className="p-1 bg-green-500 rounded-full transition ease-in-out hover:scale-125">

              <button 
                id="camButton"
                onClick={() => disableMyStream(db, myPeer, params.roomId, username, myPeerDocId, setMyPeerDocId, stopMyStream, setStopMyStream)}
              >
                <img src={cameraIcon} className="w-12 h-10" alt="camera"/>
              </button>
            </div>
            <div className="p-1 bg-red-500 rounded-full transition ease-in-out hover:scale-125">
              <button 
                id="hangupButton"
                onClick={() => disconnectMyCall(db, myPeer, params.roomId as string, username, navigate)}
              >
                <img src={phoneHangupIcon} className="w-12 h-10" alt="hangup"/>
              </button>
            </div>
          </div>
        </div>

        {/* room share link */}
        <div className="flex p-2 text-xl bg-slate-100 text-blue-800 rounded-2xl">
          <input 
            id="shareLink" type="text" readOnly
            value={`${window.location.origin}/${params.roomId}`}
            className="bg-transparent"
          />

          <button onClick={_ => copyToClipboard()} className="p-1">
            <img
              src={copyIcon}
              className="w-full h-full bg-slate-200 transition ease-in hover:scale-125"
              alt="copy"
            />
          </button>
        </div>

      </div>

    </div>
  )
}

async function getLocalVideo() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true});
  return stream;
}

async function removeLocalVideo() {
  const localStream = document.getElementById("localStreamRoom") as HTMLVideoElement; 
  localStream.srcObject = null;
  localStream.remove();
}

function disconnectMyCall(db: Firestore, myPeer: Peer | undefined, roomId: string, username: string, navigate: any) {
  addDisconnectCallDocument(db, roomId, username, myPeer)
    .then(res => {
      if (res == true) {
        removeLocalVideo();
        navigate('/');
      }
      else
        console.log('cannot disconnect, something went wrong');
    })
}

async function disableMyStream(db, myPeer, roomId, username, myPeerDocId, setMyPeerDocId, stopMyStream, setStopMyStream) {
  
  if (myPeer !== undefined && roomId !== undefined && myPeerDocId !== "") {

    if (stopMyStream) {
      // enable my stream
      addMyPeerDocument(db, roomId, username, myPeer)
        .then(docRefId => {
          if (docRefId.length > 0) {
            setMyPeerDocId(docRefId);
          } else {
            console.log("error adding myPeerId document to firestore");
          }
        })
    } else {
      // disable my stream
      removeMyPeerIdDocument(db, roomId, myPeerDocId);
    }

    setStopMyStream(!stopMyStream);

  }

}


function copyToClipboard() {
  const shareLinkElement = document.getElementById("shareLink") as HTMLInputElement;
  if (shareLinkElement) {
    navigator.clipboard.writeText(shareLinkElement.value);
  }
}

interface DisableStream {
  db: Firestore,
  myPeer: Peer | undefined,
  roomId: string | undefined,
  username: string,
  myPeerDocId: string,
  setMyPeerDocId: any,
  stopMyStream: boolean,
  setStopMyStream: any
}