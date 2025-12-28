export enum PostCategory {
  GENERAL = 'GENERAL',
  SUCCESS_STORY = 'SUCCESS_STORY',
  TIP = 'TIP',
  QUESTION = 'QUESTION',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
}

export interface CommunityPost {
  id: string;
  authorId: string;
  title: string;
  content: string;
  category: PostCategory;
  createdAt: Date;
  updatedAt: Date;
  author?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  _count?: {
    comments: number;
    likes: number;
  };
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  _count?: {
    likes: number;
  };
}

export interface CommunityLike {
  id: string;
  agentId: string;
  postId?: string | null;
  commentId?: string | null;
  createdAt: Date;
}

export interface CreatePostDto {
  title: string;
  content: string;
  category?: PostCategory;
}

export interface CreateCommentDto {
  content: string;
}
