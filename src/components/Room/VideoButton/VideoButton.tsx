import { Firestore } from 'firebase/firestore';
import Peer from 'peerjs';
import { useContext, useState } from 'react';
import { AppContext } from '../../../App';
import cameraIcon from '../../../assets/icons/camera.svg';
import { addMyPeerDocument, removeMyPeerIdDocument } from '../utilities/firestoreManipulation';

interface Props {
  myPeer: Peer | undefined;
  roomId: string,
  myPeerDocId: string,
  setMyPeerDocId: any,
}

export default function VideoButton(props: Props) {

  const {
    db,
    localStream,
    username,
  } = useContext(AppContext);

  const [stopMyStream, setStopMyStream] = useState(false);

  const {
    myPeer,
    roomId,
    myPeerDocId,
    setMyPeerDocId
  } = props;
  
  return (
    <div className="p-1 bg-green-500 rounded-full transition ease-in-out hover:scale-125">
      <button 
        id="camButton"
        onClick={() =>{
          disableMyStream(db, myPeer, roomId, username,
             myPeerDocId, setMyPeerDocId, stopMyStream, setStopMyStream);
          toggleLocalStream(localStream);
          }
        }
      >
        <img src={cameraIcon} className="w-12 h-10" alt="camera"/>
      </button>
    </div>
  )
}

function disableMyStream(
  db: Firestore,
  myPeer: Peer | undefined,
  roomId: string,
  username: string,
  myPeerDocId: string,
  setMyPeerDocId: any,
  stopMyStream: boolean,
  setStopMyStream: any,
) {
  if (myPeer !== undefined && roomId !== undefined && myPeerDocId.length > 0) {
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

function toggleLocalStream(localStream: MediaStream | null) {
  const localVideo = document.getElementById("localStreamRoom") as HTMLVideoElement;
  if (localVideo.srcObject !== null) {
    localVideo.srcObject = null;
    localVideo.style.objectFit = "none";
  } else {
    localVideo.srcObject = localStream;
    localVideo.style.objectFit = "cover";
  }
}