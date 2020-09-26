import { AclActions } from "../auth/auth.acl";
import { AuthService } from "../auth/auth.service";
import { FirebaseService } from "../firebase/firebase.service";
import { IQuestionRecord } from "./questions.types";

export class QuestionsService {
  constructor(
    private firebaseService: FirebaseService,
    private authService: AuthService,
    private roomId: string
  ) {
    console.log(`QuestionsService :: Constructor for room ${this.roomId}`);
  }

  private _getRoom = () =>
    this.firebaseService.db.collection("rooms").doc(this.roomId);

  deleteQuestion = async (questionId: string) => {
    return this._getRoom().collection("questions").doc(questionId).delete();
  };

  approveQuestion = async (questionId: string) => {
    return this._getRoom()
      .collection("questions")
      .doc(questionId)
      .update({ approved: true });
  };

  askQuestion = async (question: IQuestionRecord) => {
    // TODO: Add ACL layer, here?
    console.log(
      "askQuestionInRoom",
      { roomId: this.roomId },
      { user: this.firebaseService.auth.currentUser }
    );
    // TODO: Generate CreatedAt on the Backend
    const createdAt = new Date();
    const questionRef = this._getRoom()
      .collection("questions")
      .add({ ...question, createdAt });
    const questionAskedSnapshot = await (await questionRef).get();
    const questionId = questionAskedSnapshot.id;

    if (
      this.firebaseService.auth.currentUser &&
      this.firebaseService.auth.currentUser.uid
    ) {
      this.authService
        .userProfileRef(this.firebaseService.auth.currentUser.uid)
        .collection("votes")
        .doc(questionId)
        .set({ questionId });
    }
    return true;
  };

  upVoteQuestion = async (questionId: string) => {
    const user = this.firebaseService.auth.currentUser;
    if (!this.authService.canUserDo(AclActions.UP_VOTE_QUESTION)) {
      // TODO: Throw error here?
      return false;
    }

    console.log(
      "QuestionsService :: upVoteQuestion",
      { questionId },
      { uid: user?.uid }
    );
    const batch = this.firebaseService.db.batch();
    const questionRef = this._getRoom().collection("questions").doc(questionId);

    // TODO: Expand ACL here
    if (
      this.firebaseService.auth.currentUser &&
      this.firebaseService.auth.currentUser.uid
    ) {
      const hasVotedRef = this.authService
        .userProfileRef(this.firebaseService.auth.currentUser.uid)
        .collection("votes")
        .doc(questionId);
      const hasVoted = await hasVotedRef.get();
      // Check if the user already voted
      if (hasVoted.exists) {
        // If so, do nothing
        return Promise.reject("The user has already voted for this question");
      }
      batch.set(hasVotedRef, { questionId });
    }

    // if not, then increment the count, and add a log that this user has now voted
    batch.set(
      questionRef,
      { upVotes: this.firebaseService.increment },
      { merge: true }
    );
    batch.commit();
    return true;
  };
}
