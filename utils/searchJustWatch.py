from justwatch import JustWatch
import argparse

just_watch = JustWatch(country='SK')

parser = argparse.ArgumentParser()
group = parser.add_mutually_exclusive_group(required=True)
group.add_argument("-t", "--title", help="The title of the item")
group.add_argument("-p", "--person", help="The person associated with the item")
args = parser.parse_args()

if args.title:
    # print("Title:", args.title)
    results = just_watch.search_for_item(query=args.title)
else:
    # print("Person:", args.person)
    results = just_watch.search_for_item(query=args.person, content_types=['person'])

print(results['items'])
