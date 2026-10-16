const BOARD_ID = 'ULAuklhQ';
const API = 'https://api.trello.com/1';

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  url: string;
  idBoard: string;
  idList: string;
  pos: number;
}

export interface TrelloChecklist {
  id: string;
  name: string;
  checkItems: { id: string; name: string; state: 'complete' | 'incomplete' }[];
}

interface TrelloList {
  id: string;
  name: string;
  closed: boolean;
}

export function createTrelloClient(getToken: () => Promise<string>, request: typeof fetch = fetch) {
  async function api<T>(path: string, method: 'GET' | 'PUT' = 'GET', body?: Record<string, string>): Promise<T> {
    const token = await getToken();
    const response = await request(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (response.status === 401) throw new Error('Trello authorization expired');
    if (!response.ok) throw new Error('Trello is unavailable');
    return response.json() as Promise<T>;
  }

  async function lists(): Promise<{ today: TrelloList; done: TrelloList }> {
    const all = await api<TrelloList[]>(`/boards/${BOARD_ID}/lists?filter=open&fields=id,name,closed`);
    const today = all.find((list) => !list.closed && list.name === 'Today — max 3');
    const done = all.find((list) => !list.closed && list.name === 'Done');
    if (!today || !done) throw new Error('Today or Done list not found on the authorized board');
    return { today, done };
  }

  async function listCards(listId: string): Promise<TrelloCard[]> {
    const cards = await api<TrelloCard[]>(`/lists/${encodeURIComponent(listId)}/cards?fields=id,name,desc,url,idBoard,idList,pos`);
    return cards.sort((first, second) => first.pos - second.pos);
  }

  async function cardDetails(cardId: string): Promise<{ card: TrelloCard; checklists: TrelloChecklist[] }> {
    const card = await api<TrelloCard>(`/cards/${encodeURIComponent(cardId)}?fields=id,name,desc,url,idBoard,idList,pos`);
    const { today, done } = await lists();
    if (card.idList !== today.id && card.idList !== done.id) throw new Error('Card is not on Today or Done');
    const checklists = await api<TrelloChecklist[]>(`/cards/${encodeURIComponent(cardId)}/checklists?checkItems=all&fields=id,name`);
    return { card, checklists };
  }

  async function moveCard(cardId: string, completed: boolean): Promise<void> {
    const { today, done } = await lists();
    const card = await api<TrelloCard>(`/cards/${encodeURIComponent(cardId)}?fields=id,idBoard,idList`);
    if (card.idList !== today.id && card.idList !== done.id) throw new Error('Card is not on Today or Done');
    const destination = completed ? done.id : today.id;
    if (card.idList !== destination) {
      await api(`/cards/${encodeURIComponent(cardId)}`, 'PUT', { idList: destination });
    }
  }

  async function setCheckItem(cardId: string, itemId: string, completed: boolean): Promise<void> {
    const { checklists } = await cardDetails(cardId);
    if (!checklists.some((checklist) => checklist.checkItems.some((item) => item.id === itemId))) {
      throw new Error('Checklist item is not on this card');
    }
    await api(`/cards/${encodeURIComponent(cardId)}/checkItem/${encodeURIComponent(itemId)}`, 'PUT', {
      state: completed ? 'complete' : 'incomplete',
    });
  }

  return { lists, listCards, cardDetails, moveCard, setCheckItem };
}