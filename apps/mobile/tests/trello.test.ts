import { createTrelloClient } from '../src/data/trello';

const responses = new Map<string, unknown>();
const request = jest.fn(async (url: string) => ({ ok: true, status: 200, json: async () => responses.get(url) }));
const api = 'https://api.trello.com/1';
const client = createTrelloClient(async () => 'authorized-token', request as unknown as typeof fetch);

beforeEach(() => {
  jest.clearAllMocks();
  responses.clear();
  responses.set(`${api}/boards/ULAuklhQ/lists?filter=open&fields=id,name,closed`, [
    { id: 'today-id', name: 'Today — max 3', closed: false },
    { id: 'done-id', name: 'Done', closed: false },
  ]);
});

it('returns every Today card in Trello order even above three', async () => {
  responses.set(`${api}/lists/today-id/cards?fields=id,name,desc,url,idBoard,idList,pos`, [
    { id: 'fourth', pos: 4 }, { id: 'third', pos: 3 }, { id: 'second', pos: 2 }, { id: 'first', pos: 1 },
  ]);

  const { today } = await client.lists();
  expect((await client.listCards(today.id)).map((card) => card.id)).toEqual(['first', 'second', 'third', 'fourth']);
  expect(request).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer authorized-token' }) }));
});

it('moves a card to Done and back to Today without a capacity check', async () => {
  responses.set(`${api}/cards/card-id?fields=id,idBoard,idList`, { id: 'card-id', idList: 'today-id' });
  await client.moveCard('card-id', true);
  expect(request).toHaveBeenLastCalledWith(`${api}/cards/card-id`, expect.objectContaining({ method: 'PUT', body: JSON.stringify({ idList: 'done-id' }) }));

  responses.set(`${api}/cards/card-id?fields=id,idBoard,idList`, { id: 'card-id', idList: 'done-id' });
  await client.moveCard('card-id', false);
  expect(request).toHaveBeenLastCalledWith(`${api}/cards/card-id`, expect.objectContaining({ method: 'PUT', body: JSON.stringify({ idList: 'today-id' }) }));
});

it('ticks only a checklist item belonging to the selected card', async () => {
  responses.set(`${api}/cards/card-id?fields=id,name,desc,url,idBoard,idList,pos`, { id: 'card-id', idList: 'today-id' });
  responses.set(`${api}/cards/card-id/checklists?checkItems=all&fields=id,name`, [
    { id: 'list', name: 'Steps', checkItems: [{ id: 'item', name: 'Call', state: 'incomplete' }] },
  ]);

  await client.setCheckItem('card-id', 'item', true);
  expect(request).toHaveBeenLastCalledWith(`${api}/cards/card-id/checkItem/item`, expect.objectContaining({ method: 'PUT', body: JSON.stringify({ state: 'complete' }) }));
  await expect(client.setCheckItem('card-id', 'other', true)).rejects.toThrow('Checklist item is not on this card');
});

it('rejects moves from other lists without writing', async () => {
  responses.set(`${api}/cards/card-id?fields=id,idBoard,idList`, { id: 'card-id', idList: 'waiting-id' });
  await expect(client.moveCard('card-id', true)).rejects.toThrow('Card is not on Today or Done');
  expect(request.mock.calls.every(([, options]) => options?.method !== 'PUT')).toBe(true);
});