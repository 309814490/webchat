import axios from 'axios';

const API_BASE = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface LoginParams {
  studentId: string;
  password: string;
}

export interface RegisterParams {
  studentId: string;
  name: string;
  idCard: string;
  phone: string;
  password: string;
}

export interface ResetPasswordParams {
  phone: string;
  studentId: string;
  newPassword: string;
}

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  studentId: string | null;
  idCard: string | null;
  avatarUrl: string | null;
  status: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: UserInfo;
}

export interface SearchUserParams {
  type: 'studentId' | 'phone';
  value: string;
}

export interface CreateGroupParams {
  name: string;
  memberIds: number[];
}

export interface ConversationInfo {
  id: number;
  type: 'PRIVATE' | 'GROUP';
  name: string;
  avatarUrl?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  otherUserId?: number;
  otherUsername?: string;
  otherStudentId?: string;
  pinned?: boolean;
}

export interface FriendRequestInfo {
  id: number;
  fromUserId: number;
  fromUsername: string;
  fromStudentId: string;
  fromPhone: string;
  fromAvatarUrl?: string;
  status: string;
  createdAt: string;
}

export const authApi = {
  login: (data: LoginParams) =>
    api.post<AuthResponse>('/auth/login', data),
  register: (data: RegisterParams) =>
    api.post<AuthResponse>('/auth/register', data),
  resetPassword: (data: ResetPasswordParams) =>
    api.post<{ message: string }>('/auth/reset-password', data),
};

export const friendApi = {
  searchUser: (data: SearchUserParams) =>
    api.post<UserInfo>('/friends/search', data),
  sendFriendRequest: (toUserId: number) =>
    api.post<{ message: string }>('/friends/request', { toUserId }),
  getFriendList: () =>
    api.get<UserInfo[]>('/friends/list'),
  getPendingRequests: () =>
    api.get<FriendRequestInfo[]>('/friends/requests/pending'),
  acceptFriendRequest: (requestId: number) =>
    api.post<{ message: string }>(`/friends/request/${requestId}/accept`),
  rejectFriendRequest: (requestId: number) =>
    api.post<{ message: string }>(`/friends/request/${requestId}/reject`),
};

export const groupApi = {
  createGroup: (data: CreateGroupParams) =>
    api.post<{ id: number; name: string }>('/groups/create', data),
  getUserGroups: () =>
    api.get<any[]>('/groups/list'),
  getGroupMembers: (groupId: number) =>
    api.get<any[]>(`/groups/${groupId}/members`),
  deleteGroup: (groupId: number) =>
    api.delete<{ message: string }>(`/groups/${groupId}`),
  removeMember: (groupId: number, userId: number) =>
    api.delete<{ message: string }>(`/groups/${groupId}/members/${userId}`),
  addMembers: (groupId: number, memberIds: number[]) =>
    api.post<{ message: string }>(`/groups/${groupId}/members`, { memberIds }),
  updateGroupName: (groupId: number, name: string) =>
    api.put<{ message: string }>(`/groups/${groupId}/name`, { name }),
  updateGroupAnnouncement: (groupId: number, announcement: string) =>
    api.put<{ message: string }>(`/groups/${groupId}/announcement`, { announcement }),
  getGroupAnnouncement: (groupId: number) =>
    api.get<{ announcement: string }>(`/groups/${groupId}/announcement`),
  transferOwner: (groupId: number, newOwnerId: number) =>
    api.post<{ message: string }>(`/groups/${groupId}/transfer`, { newOwnerId }),
  setAdmin: (groupId: number, userId: number) =>
    api.post<{ message: string }>(`/groups/${groupId}/admins/${userId}`),
  removeAdmin: (groupId: number, userId: number) =>
    api.delete<{ message: string }>(`/groups/${groupId}/admins/${userId}`),
  createAnnouncement: (groupId: number, content: string) =>
    api.post<any>(`/groups/${groupId}/announcements`, { content }),
  getAnnouncements: (groupId: number) =>
    api.get<any[]>(`/groups/${groupId}/announcements`),
  getLatestAnnouncement: (groupId: number) =>
    api.get<any>(`/groups/${groupId}/announcements/latest`),
  deleteAnnouncement: (groupId: number, announcementId: number) =>
    api.delete<{ message: string }>(`/groups/${groupId}/announcements/${announcementId}`),
  leaveGroup: (groupId: number) =>
    api.post<{ message: string }>(`/groups/${groupId}/leave`),
  dissolveGroup: (groupId: number) =>
    api.post<{ message: string }>(`/groups/${groupId}/dissolve`),
  updateGroupSettings: (groupId: number, settings: { allowMemberAddFriend?: boolean; allowMemberViewProfile?: boolean }) =>
    api.put<{ message: string }>(`/groups/${groupId}/settings`, settings),
};

export const conversationApi = {
  getUserConversations: () =>
    api.get<ConversationInfo[]>('/conversations/list'),
  markAsRead: (conversationId: number) =>
    api.post<{ message: string }>(`/conversations/${conversationId}/read`),
  getOrCreatePrivateConversation: (friendId: number) =>
    api.post<any>('/conversations/private', { friendId }),
  getConversationMemberCount: (conversationId: number) =>
    api.get<{ count: number }>(`/conversations/${conversationId}/members/count`),
  getConversationMembers: (conversationId: number) =>
    api.get<any[]>(`/conversations/${conversationId}/members`),
  pinConversation: (conversationId: number) =>
    api.post<{ message: string }>(`/conversations/${conversationId}/pin`),
  unpinConversation: (conversationId: number) =>
    api.post<{ message: string }>(`/conversations/${conversationId}/unpin`),
  getGroupSettings: (conversationId: number) =>
    api.get<{ allowMemberAddFriend: boolean; allowMemberViewProfile: boolean }>(`/conversations/${conversationId}/settings`),
};

export const messageApi = {
  sendMessage: (data: { conversationId: number; content: string; type: string; metadata?: any; replyToId?: number; mentionedUserIds?: number[]; mentionAll?: boolean }) =>
    api.post<any>('/messages', data),
  getMessages: (conversationId: number, page: number = 0, size: number = 50) =>
    api.get<any>(`/messages/conversation/${conversationId}?page=${page}&size=${size}`),
  searchMessages: (conversationId: number, keyword: string, page: number = 0, size: number = 20) =>
    api.get<any>(`/messages/conversation/${conversationId}/search?keyword=${encodeURIComponent(keyword)}&page=${page}&size=${size}`),
  searchByType: (conversationId: number, types: string[], page: number = 0, size: number = 20) =>
    api.get<any>(`/messages/conversation/${conversationId}/search/type?types=${types.join(',')}&page=${page}&size=${size}`),
  searchByDate: (conversationId: number, startDate: string, endDate: string, page: number = 0, size: number = 20) =>
    api.get<any>(`/messages/conversation/${conversationId}/search/date?startDate=${startDate}&endDate=${endDate}&page=${page}&size=${size}`),
  searchBySender: (conversationId: number, senderId: number, page: number = 0, size: number = 20) =>
    api.get<any>(`/messages/conversation/${conversationId}/search/sender?senderId=${senderId}&page=${page}&size=${size}`),
  recallMessage: (messageId: number) =>
    api.post<any>(`/messages/${messageId}/recall`),
  globalSearch: (keyword: string, page: number = 0, size: number = 20) =>
    api.get<any>(`/messages/search/global?keyword=${encodeURIComponent(keyword)}&page=${page}&size=${size}`),
  globalSearchByType: (types: string[], page: number = 0, size: number = 20) =>
    api.get<any>(`/messages/search/global/type?types=${types.join(',')}&page=${page}&size=${size}`),
};

export const fileApi = {
  uploadFile: (file: File, type: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return api.post<{ url: string; fileName: string; fileType: string; fileSize: number }>(
      '/files/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  },
};

export const userApi = {
  getProfile: () =>
    api.get<UserInfo>('/user/profile'),
  updateProfile: (data: { username?: string; phone?: string; avatarUrl?: string }) =>
    api.put<UserInfo>('/user/profile', data),
  updatePassword: (data: { oldPassword: string; newPassword: string }) =>
    api.put<{ message: string }>('/user/password', data),
};

export default api;
