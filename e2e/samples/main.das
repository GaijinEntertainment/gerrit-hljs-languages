require math

struct Point
    x : float
    y : float

def length(p : Point) : float
    return sqrt(p.x * p.x + p.y * p.y)

[export]
def main
    let p = Point(x = 3.0, y = 4.0)
    print("length = {length(p)}\n")
